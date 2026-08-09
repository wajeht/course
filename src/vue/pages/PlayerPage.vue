<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { api, type CourseDetailDto, type LessonDto, type PlaybackResult } from "../api/client";
import LessonRow from "../components/LessonRow.vue";

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
let hls: import("hls.js").default | null = null;
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let lastSavedAt = 0;
let resumeApplied = false;

const allLessons = computed(
  () => course.value?.sections.flatMap((section) => section.lessons) ?? [],
);
const currentIndex = computed(() =>
  allLessons.value.findIndex((item) => item.id === lesson.value?.id),
);
const nextLesson = computed(() => allLessons.value.at(currentIndex.value + 1));

function destroyPlayback(): void {
  clearTimeout(pollTimer);
  hls?.destroy();
  hls = null;
  if (video.value) {
    video.value.pause();
    video.value.removeAttribute("src");
    video.value.load();
  }
}

async function attachSource(url: string, kind: "direct" | "hls"): Promise<void> {
  await nextTick();
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

async function handlePlayback(result: PlaybackResult): Promise<void> {
  playback.value = result;
  if (result.kind === "direct") return attachSource(result.url, "direct");
  if (result.kind === "hls") return attachSource(result.url, "hls");
  if (result.kind === "error") {
    error.value = result.message;
    return;
  }
  pollTimer = setTimeout(async () => {
    try {
      await handlePlayback(await api.conversion(String(route.params.lessonId)));
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not check conversion";
    }
  }, 2_000);
}

async function load(): Promise<void> {
  destroyPlayback();
  loading.value = true;
  error.value = "";
  ended.value = false;
  sidebarOpen.value = false;
  try {
    const lessonId = String(route.params.lessonId);
    const detail = await api.lesson(lessonId);
    lesson.value = detail.lesson;
    course.value = detail.course;
    await handlePlayback(await api.playback(lessonId));
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Could not load this lesson";
  } finally {
    loading.value = false;
  }
}

function applyResume(): void {
  if (!video.value || !lesson.value || resumeApplied) return;
  resumeApplied = true;
  if (!lesson.value.completed && lesson.value.positionSeconds > 0) {
    video.value.currentTime = Math.min(
      lesson.value.positionSeconds,
      Math.max(0, video.value.duration - 1),
    );
  }
  video.value.playbackRate = playbackRate.value;
}

async function saveProgress(force = false): Promise<void> {
  if (!video.value || !lesson.value || ended.value) return;
  const position = video.value.currentTime;
  if (!force && Math.abs(position - lastSavedAt) < 10) return;
  lastSavedAt = position;
  try {
    await api.saveProgress(lesson.value.id, position);
  } catch {
    // The next periodic save retries without interrupting playback.
  }
}

function saveOnExit(): void {
  if (!video.value || !lesson.value || ended.value) return;
  void fetch(`/api/progress/lessons/${lesson.value.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ positionSeconds: video.value.currentTime }),
    keepalive: true,
  });
}

async function markComplete(): Promise<void> {
  if (!lesson.value) return;
  ended.value = true;
  await api.completeLesson(lesson.value.id);
  lesson.value.completed = true;
  lesson.value.progressPercent = 100;
}

async function retryConversion(): Promise<void> {
  if (!lesson.value) return;
  error.value = "";
  await handlePlayback(await api.retryConversion(lesson.value.id));
}

async function resetProgress(): Promise<void> {
  if (!lesson.value || !window.confirm("Reset progress for this lesson?")) return;
  await api.resetLesson(lesson.value.id);
  lesson.value.positionSeconds = 0;
  lesson.value.progressPercent = 0;
  lesson.value.completed = false;
  ended.value = false;
  if (video.value) video.value.currentTime = 0;
}

function updatePlaybackRate(): void {
  if (video.value) video.value.playbackRate = playbackRate.value;
}

function handleVisibility(): void {
  if (document.visibilityState === "hidden") void saveProgress(true);
}

watch(
  () => route.params.lessonId,
  () => void load(),
  { immediate: true },
);
window.addEventListener("pagehide", saveOnExit);
document.addEventListener("visibilitychange", handleVisibility);

onBeforeUnmount(() => {
  void saveProgress(true);
  destroyPlayback();
  window.removeEventListener("pagehide", saveOnExit);
  document.removeEventListener("visibilitychange", handleVisibility);
});
</script>

<template>
  <main class="player-page">
    <section class="player-stage">
      <div class="player-topline">
        <RouterLink
          v-if="course"
          :to="{ name: 'course', params: { courseId: course.id } }"
          class="back-link back-link--light"
        >
          ← {{ course.title }}
        </RouterLink>
        <button class="mobile-lessons" @click="sidebarOpen = !sidebarOpen">Lessons</button>
      </div>
      <div class="video-frame">
        <video
          ref="video"
          controls
          playsinline
          @loadedmetadata="applyResume"
          @timeupdate="saveProgress()"
          @pause="saveProgress(true)"
          @ended="markComplete"
        />
        <div v-if="loading" class="video-status">
          <div class="loading-mark loading-mark--light" />
          <p>Preparing lesson…</p>
        </div>
        <div v-else-if="playback?.kind === 'converting'" class="video-status">
          <div class="conversion-ring" :style="{ '--progress': `${playback.progress * 3.6}deg` }" />
          <h2>Converting for your browser</h2>
          <p>{{ playback.progress }}% · Quick Sync is preparing the first segments.</p>
        </div>
        <div v-else-if="error" class="video-status video-status--error">
          <h2>Video unavailable</h2>
          <p>{{ error }}</p>
          <button
            v-if="playback?.kind === 'error'"
            class="button button--light"
            @click="retryConversion"
          >
            Retry conversion
          </button>
        </div>
        <div v-if="ended" class="ended-card">
          <span>Lesson complete</span>
          <h2>{{ nextLesson ? "Ready for the next one?" : "Course complete." }}</h2>
          <RouterLink
            v-if="nextLesson"
            :to="{ name: 'player', params: { lessonId: nextLesson.id } }"
            class="button button--light"
            >Next lesson →</RouterLink
          >
        </div>
      </div>
      <div v-if="lesson" class="player-meta">
        <div>
          <p class="eyebrow">{{ lesson.sectionTitle ?? "Course lesson" }}</p>
          <h1>{{ lesson.title }}</h1>
        </div>
        <div class="player-controls">
          <label
            >Speed
            <select v-model="playbackRate" @change="updatePlaybackRate">
              <option v-for="rate in [0.5, 0.75, 1, 1.25, 1.5, 2]" :key="rate" :value="rate">
                {{ rate }}×
              </option>
            </select>
          </label>
          <button class="text-button" @click="resetProgress">Reset lesson</button>
        </div>
      </div>
    </section>

    <aside v-if="course" class="lesson-sidebar" :class="{ 'lesson-sidebar--open': sidebarOpen }">
      <div class="lesson-sidebar__header">
        <div>
          <p class="eyebrow">Curriculum</p>
          <h2>{{ currentIndex + 1 }} / {{ allLessons.length }}</h2>
        </div>
        <button class="sidebar-close" aria-label="Close lessons" @click="sidebarOpen = false">
          ×
        </button>
      </div>
      <div class="lesson-sidebar__scroll">
        <section
          v-for="section in course.sections"
          :key="section.id ?? 'direct'"
          class="sidebar-section"
        >
          <h3>{{ section.title }}</h3>
          <LessonRow
            v-for="(item, index) in section.lessons"
            :key="item.id"
            :lesson="item"
            :index="index"
            :active="item.id === lesson?.id"
          />
        </section>
      </div>
    </aside>
  </main>
</template>
