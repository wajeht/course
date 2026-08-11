<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { api, type CourseDetailDto, type LessonDto, type PlaybackResult } from "../api";
import LessonRow from "../components/LessonRow.vue";
import {
  activatePlaybackSession,
  createPlaybackSession,
  exitPlaybackPosition,
  persistPlaybackProgress,
  recordPlaybackPosition,
  stopPlaybackSession,
  type PlaybackSession,
} from "../playback-session.js";

const route = useRoute();
const video = ref<HTMLVideoElement | null>(null);
const lesson = ref<LessonDto | null>(null);
const course = ref<CourseDetailDto | null>(null);
const playback = ref<PlaybackResult | null>(null);
const loading = ref(true);
const error = ref("");
const ended = ref(false);
const sidebarOpen = ref(false);
const playbackRate = ref(1);
const expandedSectionKeys = ref<Set<string>>(new Set());
let hls: import("hls.js").default | null = null;
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let resumeApplied = false;
let playerRequestId = 0;
let playbackSession: PlaybackSession | null = null;

const allLessons = computed(
  () => course.value?.sections.flatMap((section) => section.lessons) ?? [],
);
const currentIndex = computed(() =>
  allLessons.value.findIndex((item) => item.id === lesson.value?.id),
);
const nextLesson = computed(() => allLessons.value.at(currentIndex.value + 1));

type CourseSection = CourseDetailDto["sections"][number];

function sectionKey(section: CourseSection): string {
  return section.id ?? "direct";
}

function sectionPanelId(section: CourseSection): string {
  return `sidebar-section-${sectionKey(section)}`;
}

function isSectionExpanded(section: CourseSection): boolean {
  return expandedSectionKeys.value.has(sectionKey(section));
}

function toggleSection(section: CourseSection): void {
  const key = sectionKey(section);
  const expandedKeys = new Set(expandedSectionKeys.value);
  if (expandedKeys.has(key)) expandedKeys.delete(key);
  else expandedKeys.add(key);
  expandedSectionKeys.value = expandedKeys;
}

function destroyPlayback(): void {
  if (playbackSession) stopPlaybackSession(playbackSession);
  playbackSession = null;
  clearTimeout(pollTimer);
  hls?.destroy();
  hls = null;
  if (video.value) {
    video.value.pause();
    video.value.removeAttribute("src");
    video.value.load();
  }
}

async function attachSource(url: string, kind: "direct" | "hls", requestId: number): Promise<void> {
  await nextTick();
  if (requestId !== playerRequestId) return;
  const element = video.value;
  if (!element) return;
  hls?.destroy();
  hls = null;
  resumeApplied = false;

  if (kind === "direct" || element.canPlayType("application/vnd.apple.mpegurl")) {
    element.src = url;
    element.load();
    return;
  }
  const { default: Hls } = await import("hls.js/light");
  if (requestId !== playerRequestId) return;
  if (!Hls.isSupported()) {
    error.value = "This browser cannot play the converted video.";
    return;
  }
  hls = new Hls({ enableWorker: true, backBufferLength: 30 });
  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (data.fatal) error.value = "Playback stopped because the video stream failed.";
  });
  hls.loadSource(url);
  hls.attachMedia(element);
}

async function handlePlayback(
  result: PlaybackResult,
  lessonId: string,
  requestId: number,
): Promise<void> {
  if (requestId !== playerRequestId) return;
  playback.value = result;
  if (result.kind === "direct") return attachSource(result.url, "direct", requestId);
  if (result.kind === "hls") return attachSource(result.url, "hls", requestId);
  if (result.kind === "error") {
    error.value = result.message;
    return;
  }
  pollTimer = setTimeout(async () => {
    try {
      const conversion = await api.getConversionStatus(lessonId);
      await handlePlayback(conversion, lessonId, requestId);
    } catch (caught) {
      if (requestId !== playerRequestId) return;
      error.value = caught instanceof Error ? caught.message : "Could not check conversion";
    }
  }, 2_000);
}

async function loadPlayer(): Promise<void> {
  const requestId = ++playerRequestId;
  capturePlaybackPosition();
  await savePlaybackProgress(true);
  if (requestId !== playerRequestId) return;
  const previousCourseId = course.value?.id;
  destroyPlayback();
  loading.value = true;
  error.value = "";
  ended.value = false;
  sidebarOpen.value = false;
  try {
    const lessonId = String(route.params.lessonId);
    const detail = await api.getLesson(lessonId);
    if (requestId !== playerRequestId) return;
    lesson.value = detail.lesson;
    playbackSession = createPlaybackSession(detail.lesson.id, detail.lesson.positionSeconds);
    course.value = detail.course;
    const activeSection = detail.course.sections.find((section) =>
      section.lessons.some((item) => item.id === detail.lesson.id),
    );
    if (activeSection) {
      const activeKey = sectionKey(activeSection);
      expandedSectionKeys.value =
        previousCourseId === detail.course.id
          ? new Set([...expandedSectionKeys.value, activeKey])
          : new Set([activeKey]);
    }
    const preparedPlayback = await api.preparePlayback(lessonId);
    await handlePlayback(preparedPlayback, lessonId, requestId);
  } catch (caught) {
    if (requestId !== playerRequestId) return;
    error.value = caught instanceof Error ? caught.message : "Could not load this lesson";
  } finally {
    if (requestId === playerRequestId) loading.value = false;
  }
}

function applyResume(): void {
  const session = playbackSession;
  if (!video.value || !lesson.value || !session || resumeApplied) return;
  if (session.lessonId !== lesson.value.id) return;
  resumeApplied = true;
  if (!lesson.value.completed && lesson.value.positionSeconds > 0) {
    video.value.currentTime = Math.min(
      lesson.value.positionSeconds,
      Math.max(0, video.value.duration - 1),
    );
  }
  video.value.playbackRate = playbackRate.value;
  activatePlaybackSession(session, video.value.currentTime);
}

function capturePlaybackPosition(): PlaybackSession | null {
  const session = playbackSession;
  if (!session?.ready || !video.value) return null;
  recordPlaybackPosition(session, video.value.currentTime);
  return session;
}

async function savePlaybackProgress(force = false): Promise<void> {
  const session = playbackSession;
  if (!session?.ready || ended.value) return;
  await persistPlaybackProgress(
    session,
    (lessonId, positionSeconds) => api.saveProgress(lessonId, positionSeconds),
    force,
  );
}

function saveOnTimeUpdate(): void {
  capturePlaybackPosition();
  void savePlaybackProgress();
}

function saveOnPause(): void {
  capturePlaybackPosition();
  void savePlaybackProgress(true);
}

function saveOnExit(): void {
  const session = capturePlaybackPosition();
  if (!session || ended.value) return;
  const position = exitPlaybackPosition(session);
  if (position === null) return;
  void fetch(`/api/progress/lessons/${session.lessonId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ positionSeconds: position }),
    keepalive: true,
  });
}

async function markComplete(): Promise<void> {
  if (!lesson.value) return;
  try {
    await api.completeLesson(lesson.value.id);
    ended.value = true;
    lesson.value.completed = true;
    lesson.value.progressPercent = 100;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Could not complete this lesson";
  }
}

async function retryConversion(): Promise<void> {
  if (!lesson.value) return;
  error.value = "";
  const lessonId = lesson.value.id;
  const requestId = playerRequestId;
  await handlePlayback(await api.retryConversion(lessonId), lessonId, requestId);
}

async function resetProgress(): Promise<void> {
  if (!lesson.value || !window.confirm("Reset progress for this lesson?")) return;
  const session = playbackSession;
  if (session) stopPlaybackSession(session);
  const previousPosition = session?.positionSeconds ?? 0;
  try {
    await session?.saveQueue;
    await api.resetLesson(lesson.value.id);
    lesson.value.positionSeconds = 0;
    lesson.value.progressPercent = 0;
    lesson.value.completed = false;
    ended.value = false;
    if (video.value) video.value.currentTime = 0;
    if (session) activatePlaybackSession(session, 0);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Could not reset this lesson";
  } finally {
    if (session && playbackSession === session && !session.ready) {
      activatePlaybackSession(session, previousPosition);
    }
  }
}

function updatePlaybackRate(): void {
  if (video.value) video.value.playbackRate = playbackRate.value;
}

function handleVisibility(): void {
  if (document.visibilityState !== "hidden") return;
  capturePlaybackPosition();
  void savePlaybackProgress(true);
}

watch(
  () => route.params.lessonId,
  () => void loadPlayer(),
  { immediate: true },
);
window.addEventListener("pagehide", saveOnExit);
document.addEventListener("visibilitychange", handleVisibility);

onBeforeUnmount(() => {
  playerRequestId++;
  capturePlaybackPosition();
  void savePlaybackProgress(true);
  destroyPlayback();
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
        <button
          class="hidden rounded-[5px] border border-white/25 bg-transparent px-[11px] py-[7px] text-white max-[860px]:inline-flex"
          @click="sidebarOpen = !sidebarOpen"
        >
          Lessons
        </button>
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
            Converting for your browser
          </h2>
          <p class="max-w-[540px] text-[.82rem] text-white/58">
            {{ playback.progress }}% · Quick Sync is preparing the first segments.
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
          <button
            v-if="playback?.kind === 'error'"
            class="mt-[22px] inline-flex min-h-11 cursor-pointer items-center justify-center gap-[9px] rounded-[7px] border border-transparent bg-white px-[18px] text-[.82rem] font-[750] text-pine-deep transition-transform duration-[160ms] hover:-translate-y-px"
            @click="retryConversion"
          >
            Retry conversion
          </button>
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
          <RouterLink
            v-if="nextLesson"
            :to="{ name: 'player', params: { lessonId: nextLesson.id } }"
            class="mt-[18px] inline-flex min-h-11 cursor-pointer items-center justify-center gap-[9px] rounded-[7px] border border-transparent bg-white px-[18px] text-[.82rem] font-[750] text-pine-deep transition-transform duration-[160ms] hover:-translate-y-px"
            >Next lesson →</RouterLink
          >
        </div>
      </div>
      <div
        v-if="lesson"
        class="flex items-start justify-between gap-[30px] max-[600px]:flex-col max-[600px]:gap-[22px]"
      >
        <div>
          <p class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
            {{ lesson.sectionTitle ?? "Course lesson" }}
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
            <select
              v-model="playbackRate"
              class="ml-2 rounded-[5px] border border-white/16 bg-[#202824] py-1.5 pr-6 pl-2 text-white"
              @change="updatePlaybackRate"
            >
              <option v-for="rate in [0.5, 0.75, 1, 1.25, 1.5, 2]" :key="rate" :value="rate">
                {{ rate }}×
              </option>
            </select>
          </label>
          <button
            class="cursor-pointer border-0 border-b border-white/20 bg-transparent px-0 py-[7px] text-[.7rem] text-white/58"
            @click="resetProgress"
          >
            Reset lesson
          </button>
        </div>
      </div>
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
            {{ currentIndex + 1 }} / {{ allLessons.length }}
          </h2>
        </div>
        <button
          class="hidden h-9 w-9 place-items-center rounded-full border border-line bg-white text-[1.4rem] text-ink max-[860px]:grid"
          aria-label="Close lessons"
          @click="sidebarOpen = false"
        >
          ×
        </button>
      </div>
      <div class="flex-1 overflow-y-auto overscroll-contain">
        <section v-for="section in course.sections" :key="section.id ?? 'direct'">
          <h3
            class="sticky top-0 z-[2] border-y border-pine/15 bg-mist font-display text-[.78rem] font-extrabold tracking-[.08em] text-pine-deep uppercase shadow-[inset_4px_0_0_#c4933f]"
          >
            <button
              class="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-belt"
              type="button"
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
            </button>
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
