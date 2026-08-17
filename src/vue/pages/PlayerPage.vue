<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import {
  api,
  isCatalogResourceNotFound,
  type CourseDetailDto,
  type LessonDetailDto,
  type LessonDto,
} from "@/api.js";
import ChapterList from "@/components/ChapterList.vue";
import LessonRow from "@/components/LessonRow.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppSelect from "@/components/ui/AppSelect.vue";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useConfirm } from "@/composables/useConfirm.js";
import { useExpandableSections } from "@/composables/useExpandableSections.js";
import { useMediaSession } from "@/composables/useMediaSession.js";
import { usePlaybackProgress } from "@/composables/usePlaybackProgress.js";
import { useScreenWakeLock } from "@/composables/useScreenWakeLock.js";
import { useToast } from "@/composables/useToast.js";
import { useVideoPlayback } from "@/composables/useVideoPlayback.js";
import { queryKeys } from "@/queries.js";
import { notFoundLocation } from "@/router.js";
import { setPageTitle } from "@/utils.js";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const video = ref<HTMLVideoElement | null>(null);
const lesson = ref<LessonDetailDto | null>(null);
const course = ref<CourseDetailDto | null>(null);
const loading = ref(true);
const ended = ref(false);
const sidebarOpen = ref(false);
const currentTime = ref(0);
const playbackRate = ref(1);
const confirmation = useConfirm();
const toast = useToast();
const { expandSection, isSectionExpanded, replaceExpandedSections, sectionPanelId, toggleSection } =
  useExpandableSections("sidebar-section");
const playbackProgress = usePlaybackProgress((lessonId, positionSeconds) =>
  api.saveProgress(lessonId, positionSeconds),
);
const videoPlayback = useVideoPlayback(video, api);
const { error, playback } = videoPlayback;
const retryAction = useAsyncAction(async (lessonId: string) => {
  await videoPlayback.retryPlayback(lessonId);
});
const resetAction = useAsyncAction(
  async (lessonId: string) => {
    if (lesson.value?.id !== lessonId || !playbackProgress.isSessionFor(lessonId)) return false;
    await playbackProgress.resetSession(video.value?.currentTime, (lessonId) =>
      api.resetLesson(lessonId),
    );
    if (lesson.value?.id !== lessonId || !playbackProgress.isSessionFor(lessonId)) return false;
    lesson.value.positionSeconds = 0;
    lesson.value.progressPercent = 0;
    lesson.value.completed = false;
    ended.value = false;
    if (video.value) video.value.currentTime = 0;
    return true;
  },
  {
    errorMessage: "Could not reset this lesson",
    onError: (caught) => {
      error.value = caught instanceof Error ? caught.message : "Could not reset this lesson";
    },
    onSuccess: async (reset) => {
      if (!reset) return;
      await invalidateCatalogCache();
      toast.success("Lesson progress reset");
    },
  },
);

const allLessons = computed(
  () => course.value?.sections.flatMap((section) => section.lessons) ?? [],
);
const currentIndex = computed(() =>
  allLessons.value.findIndex((item) => item.id === lesson.value?.id),
);
const previousLesson = computed(() =>
  currentIndex.value > 0 ? allLessons.value.at(currentIndex.value - 1) : undefined,
);
const nextLesson = computed(() =>
  currentIndex.value >= 0 ? allLessons.value.at(currentIndex.value + 1) : undefined,
);
const mediaMetadata = computed(() => {
  if (!lesson.value || !course.value) return null;
  return {
    title: lesson.value.title,
    artist: course.value.instructors.join(", ") || "Course",
    album: course.value.title,
    artwork: course.value.coverUrl,
  };
});

function invalidateCatalogCache(): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.catalog, refetchType: "none" });
}

function openLessonFromMediaSession(target: LessonDto | undefined): void {
  if (target) void router.push({ name: "player", params: { lessonId: target.id } });
}

useMediaSession(video, mediaMetadata, {
  previous: () => openLessonFromMediaSession(previousLesson.value),
  next: () => openLessonFromMediaSession(nextLesson.value),
});
useScreenWakeLock(video);

function destroyPlayback(): void {
  playbackProgress.clearSession();
  videoPlayback.clearSource();
}

async function loadPlayer(): Promise<void> {
  const requestId = videoPlayback.startRequest();
  if (ended.value) playbackProgress.stopSession();
  else await playbackProgress.finishSession(video.value?.currentTime);
  if (!videoPlayback.isCurrentRequest(requestId)) return;
  const previousCourseId = course.value?.id;
  destroyPlayback();
  loading.value = true;
  error.value = "";
  ended.value = false;
  currentTime.value = 0;
  sidebarOpen.value = false;
  try {
    const lessonId = String(route.params.lessonId);
    const detail = await api.getLesson(lessonId);
    if (!videoPlayback.isCurrentRequest(requestId)) return;
    await api.openLesson(lessonId);
    await invalidateCatalogCache();
    if (!videoPlayback.isCurrentRequest(requestId)) return;
    lesson.value = detail.lesson;
    setPageTitle(detail.lesson.title);
    playbackProgress.startSession(detail.lesson.id, detail.lesson.positionSeconds);
    course.value = detail.course;
    const activeSection = detail.course.sections.find((section) =>
      section.lessons.some((item) => item.id === detail.lesson.id),
    );
    if (activeSection) {
      if (previousCourseId === detail.course.id) expandSection(activeSection);
      else replaceExpandedSections([activeSection]);
    }
    await videoPlayback.preparePlayback(lessonId, requestId);
  } catch (caught) {
    if (!videoPlayback.isCurrentRequest(requestId)) return;
    if (isCatalogResourceNotFound(caught)) {
      await router.replace(notFoundLocation(route.path));
      return;
    }
    error.value = caught instanceof Error ? caught.message : "Could not load this lesson";
  } finally {
    if (videoPlayback.isCurrentRequest(requestId)) loading.value = false;
  }
}

function applyResume(): void {
  videoPlayback.applyMetadata((element) => {
    if (!lesson.value || !playbackProgress.isSessionFor(lesson.value.id)) return;
    if (!lesson.value.completed && lesson.value.positionSeconds > 0) {
      element.currentTime = Math.min(
        lesson.value.positionSeconds,
        Math.max(0, element.duration - 1),
      );
    }
    element.playbackRate = playbackRate.value;
    currentTime.value = element.currentTime;
    playbackProgress.activateSession(element.currentTime);
  });
}

function saveOnTimeUpdate(): void {
  currentTime.value = video.value?.currentTime ?? 0;
  playbackProgress.recordPosition(video.value?.currentTime);
  if (!ended.value) void playbackProgress.persistProgress();
}

function seekToChapter(startSeconds: number): void {
  if (!video.value) return;
  video.value.currentTime = startSeconds;
  currentTime.value = startSeconds;
}

function saveOnPause(): void {
  playbackProgress.recordPosition(video.value?.currentTime);
  if (!ended.value) void playbackProgress.persistProgress(true);
}

function saveOnExit(): void {
  if (ended.value) return;
  const snapshot = playbackProgress.captureExitSnapshot(video.value?.currentTime);
  if (!snapshot) return;
  void fetch(`/api/progress/lessons/${snapshot.lessonId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ positionSeconds: snapshot.positionSeconds }),
    keepalive: true,
  });
}

async function markComplete(): Promise<void> {
  if (!lesson.value) return;
  try {
    await api.completeLesson(lesson.value.id);
    await invalidateCatalogCache();
    ended.value = true;
    playbackProgress.stopSession();
    lesson.value.completed = true;
    lesson.value.progressPercent = 100;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Could not complete this lesson";
  }
}

async function retryConversion(): Promise<void> {
  if (!lesson.value) return;
  await retryAction.run(lesson.value.id);
}

async function resetProgress(): Promise<void> {
  if (!lesson.value) return;
  const targetLessonId = lesson.value.id;
  const confirmed = await confirmation.confirm({
    title: "Reset lesson progress?",
    message: "Your saved position and completion state for this lesson will be removed.",
    confirmLabel: "Reset lesson",
    variant: "danger",
  });
  if (!confirmed || lesson.value?.id !== targetLessonId) return;
  await resetAction.run(targetLessonId);
}

function updatePlaybackRate(): void {
  if (video.value) video.value.playbackRate = playbackRate.value;
}

function handleVisibility(): void {
  if (document.visibilityState !== "hidden") return;
  playbackProgress.recordPosition(video.value?.currentTime);
  if (!ended.value) void playbackProgress.persistProgress(true);
}

watch(
  () => route.params.lessonId,
  () => void loadPlayer(),
  { immediate: true },
);
window.addEventListener("pagehide", saveOnExit);
document.addEventListener("visibilitychange", handleVisibility);

onBeforeUnmount(() => {
  if (ended.value) playbackProgress.stopSession();
  else void playbackProgress.finishSession(video.value?.currentTime);
  playbackProgress.clearSession();
  videoPlayback.disposePlayback();
  window.removeEventListener("pagehide", saveOnExit);
  document.removeEventListener("visibilitychange", handleVisibility);
});
</script>

<template>
  <main
    class="grid min-h-[calc(100vh-66px)] grid-cols-[minmax(0,1fr)_390px] bg-[#111714] max-[1120px]:grid-cols-[minmax(0,1fr)_330px] max-[860px]:block"
  >
    <section
      class="min-w-0 px-[clamp(20px,3vw,50px)] pt-6 pb-10 text-white max-[860px]:min-h-[calc(100vh-66px)] max-[600px]:px-3 max-[600px]:pt-[18px] max-[600px]:pb-[30px]"
    >
      <div class="flex min-h-[34px] items-center justify-between">
        <RouterLink
          v-if="course"
          :to="{ name: 'course', params: { courseId: course.id } }"
          class="mb-0 inline-block max-w-[75%] overflow-hidden text-[.78rem] font-bold text-ellipsis whitespace-nowrap text-white/68 hover:text-white"
        >
          ← {{ course.title }}
        </RouterLink>
        <AppButton
          class="hidden rounded-[5px] border border-white/25 bg-transparent px-[11px] py-[7px] text-white max-[860px]:inline-flex"
          variant="unstyled"
          @click="sidebarOpen = !sidebarOpen"
        >
          Lessons
        </AppButton>
      </div>
      <div
        class="relative mx-auto mt-4 mb-[26px] grid aspect-video max-h-[calc(100vh-260px)] w-full place-items-center overflow-hidden rounded-[7px] border border-white/10 bg-[#070a08] shadow-[0_28px_80px_rgb(0_0_0_/_35%)] max-[860px]:max-h-none"
      >
        <video
          ref="video"
          class="h-full w-full object-contain"
          controls
          playsinline
          @loadedmetadata="applyResume"
          @timeupdate="saveOnTimeUpdate"
          @pause="saveOnPause"
          @ended="markComplete"
        />
        <div
          v-if="loading"
          class="absolute inset-0 grid place-items-center content-center bg-[#0c120f] p-[30px] text-center"
        >
          <div
            class="h-[42px] w-[42px] animate-spin rounded-full border-[3px] border-white/20 border-t-white"
          />
          <p class="mt-4 max-w-[540px] text-[.82rem] text-white/58">Preparing lesson…</p>
        </div>
        <div
          v-else-if="playback?.kind === 'converting'"
          class="absolute inset-0 grid place-items-center content-center bg-[#0c120f] p-[30px] text-center"
        >
          <div
            class="h-[58px] w-[58px] rounded-full bg-[conic-gradient(#e4c57f_var(--progress),rgb(255_255_255_/_12%)_0)] [mask:radial-gradient(circle,transparent_55%,black_57%)]"
            :style="{ '--progress': `${playback.progress * 3.6}deg` }"
          />
          <h2 class="mt-4 mb-[7px] font-display text-[clamp(1.6rem,3vw,2.8rem)]">
            Preparing this video
          </h2>
          <p class="max-w-[540px] text-[.82rem] text-white/58">
            {{ playback.progress }}% complete. This may take a moment.
          </p>
        </div>
        <div
          v-else-if="error"
          class="absolute inset-0 grid place-items-center content-center bg-[#0c120f] p-[30px] text-center"
        >
          <h2 class="mt-4 mb-[7px] font-display text-[clamp(1.6rem,3vw,2.8rem)]">
            Video unavailable
          </h2>
          <p class="max-w-[540px] text-[.82rem] text-white/58">{{ error }}</p>
          <AppButton
            v-if="playback?.kind === 'error'"
            class="mt-[22px]"
            variant="inverse"
            size="lg"
            :loading="retryAction.pending.value"
            loading-label="Retrying…"
            @click="retryConversion"
          >
            Try again
          </AppButton>
        </div>
        <div
          v-if="ended"
          class="absolute inset-0 z-[3] grid place-items-center content-center bg-[rgb(12_18_15_/_92%)] p-[30px] text-center backdrop-blur-lg"
        >
          <span class="text-[.7rem] font-extrabold tracking-[.16em] text-belt-light uppercase">
            Lesson complete
          </span>
          <h2 class="mt-4 mb-[7px] font-display text-[clamp(1.6rem,3vw,2.8rem)]">
            {{ nextLesson ? "Ready for the next one?" : "Course complete." }}
          </h2>
          <AppButton
            v-if="nextLesson"
            :as="RouterLink"
            :to="{ name: 'player', params: { lessonId: nextLesson.id } }"
            class="mt-[18px]"
            variant="inverse"
            size="lg"
            >Next lesson →</AppButton
          >
        </div>
      </div>
      <div
        v-if="lesson"
        class="flex items-start justify-between gap-[30px] max-[600px]:flex-col max-[600px]:gap-[22px]"
      >
        <div>
          <p class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
            {{ lesson.sectionTitle ?? "Lessons" }}
          </p>
          <h1
            class="max-w-[800px] font-display text-[clamp(1.5rem,2.6vw,2.5rem)] leading-[1.05] tracking-[-.03em]"
          >
            {{ lesson.title }}
          </h1>
        </div>
        <div
          class="flex flex-none items-center gap-[18px] max-[600px]:w-full max-[600px]:justify-between"
        >
          <label class="text-[.7rem] font-bold text-white/60">
            Speed
            <AppSelect
              v-model="playbackRate"
              class="ml-2 rounded-[5px] border border-white/16 bg-[#202824] py-1.5 pr-6 pl-2 text-white"
              variant="dark"
              @change="updatePlaybackRate"
            >
              <option v-for="rate in [0.5, 0.75, 1, 1.25, 1.5, 2]" :key="rate" :value="rate">
                {{ rate }}×
              </option>
            </AppSelect>
          </label>
          <AppButton
            class="cursor-pointer border-0 border-b border-white/20 bg-transparent px-0 py-[7px] text-[.7rem] text-white/58"
            variant="unstyled"
            :loading="resetAction.pending.value"
            loading-label="Resetting…"
            @click="resetProgress"
          >
            Reset lesson
          </AppButton>
        </div>
      </div>
      <section
        v-if="lesson?.chapters.length"
        class="mt-7 overflow-hidden rounded-[7px] border border-white/12 bg-[#f8f9f6] text-ink shadow-[0_20px_55px_rgb(0_0_0_/_18%)]"
        aria-labelledby="chapter-list-heading"
      >
        <header class="flex items-center justify-between gap-4 px-5 py-4 max-[600px]:px-4">
          <div>
            <p class="mb-1.5 text-[.65rem] font-extrabold tracking-[.18em] text-belt uppercase">
              Technique index
            </p>
            <h2 id="chapter-list-heading" class="font-display text-[1.15rem] font-extrabold">
              Chapters
            </h2>
          </div>
          <span class="font-mono text-[.72rem] font-semibold text-muted">
            {{ lesson.chapters.length }} total
          </span>
        </header>
        <div class="max-h-[380px] overflow-y-auto overscroll-contain border-t border-line">
          <ChapterList
            :chapters="lesson.chapters"
            :current-time="currentTime"
            @seek="seekToChapter"
          />
        </div>
      </section>
    </section>

    <aside
      v-if="course"
      class="sticky top-0 flex h-[calc(100vh-66px)] flex-col border-l border-[#2d3732] bg-[#f8f9f6] max-[860px]:fixed max-[860px]:inset-y-0 max-[860px]:right-0 max-[860px]:z-[70] max-[860px]:h-screen max-[860px]:w-[min(390px,92vw)] max-[860px]:border-l-0 max-[860px]:shadow-[-20px_0_60px_rgb(0_0_0_/_35%)] max-[860px]:transition-transform max-[860px]:duration-[220ms]"
      :class="sidebarOpen ? 'max-[860px]:translate-x-0' : 'max-[860px]:translate-x-[105%]'"
    >
      <div
        class="flex items-center justify-between border-b border-line px-[22px] pt-[22px] pb-[18px]"
      >
        <div>
          <p class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
            Curriculum
          </p>
          <h2 class="font-mono text-[.92rem] font-semibold">
            Lesson {{ currentIndex + 1 }} of {{ allLessons.length }}
          </h2>
        </div>
        <AppButton
          class="hidden h-9 w-9 place-items-center rounded-full border border-line bg-white text-[1.4rem] text-ink max-[860px]:grid"
          variant="unstyled"
          aria-label="Close lessons"
          @click="sidebarOpen = false"
        >
          ×
        </AppButton>
      </div>
      <div class="flex-1 overflow-y-auto overscroll-contain">
        <section v-for="section in course.sections" :key="section.id ?? 'direct'">
          <h3
            class="sticky top-0 z-[2] border-y border-pine/15 bg-mist font-display text-[.78rem] font-extrabold tracking-[.08em] text-pine-deep uppercase shadow-[inset_4px_0_0_#c4933f]"
          >
            <AppButton
              class="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-belt"
              variant="unstyled"
              :aria-expanded="isSectionExpanded(section)"
              :aria-controls="sectionPanelId(section)"
              @click="toggleSection(section)"
            >
              <span>{{ section.title }}</span>
              <span
                class="grid h-7 w-7 flex-none place-items-center rounded-full border border-pine/20 bg-white/45 text-pine"
                aria-hidden="true"
              >
                <svg
                  class="w-3 fill-none stroke-current stroke-2 transition-transform duration-200 motion-reduce:transition-none"
                  :class="isSectionExpanded(section) ? 'rotate-180' : ''"
                  viewBox="0 0 12 8"
                >
                  <path d="m1 1 5 5 5-5" />
                </svg>
              </span>
            </AppButton>
          </h3>
          <div v-show="isSectionExpanded(section)" :id="sectionPanelId(section)">
            <LessonRow
              v-for="(item, index) in section.lessons"
              :key="item.id"
              :lesson="item"
              :index="index"
              :active="item.id === lesson?.id"
              sidebar
            />
          </div>
        </section>
      </div>
    </aside>
  </main>
</template>
