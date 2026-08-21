import { useQueryClient } from "@tanstack/vue-query";
import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  api,
  apiErrorMessage,
  isCatalogResourceNotFound,
  type CourseDetailDto,
  type LessonDetailDto,
  type LessonDto,
} from "@/api.js";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useConfirm } from "@/composables/useConfirm.js";
import { useMediaSession } from "@/composables/useMediaSession.js";
import { usePlaybackProgress } from "@/composables/usePlaybackProgress.js";
import { usePauseVideoOnHidden } from "@/composables/usePauseVideoOnHidden.js";
import { useScreenWakeLock } from "@/composables/useScreenWakeLock.js";
import { useToast } from "@/composables/useToast.js";
import { useVideoPlayback } from "@/composables/useVideoPlayback.js";
import { lessonQueryOptions, queryKeys } from "@/queries.js";
import { notFoundLocation } from "@/router.js";
import { setPageTitle } from "@/utils.js";

export function useLessonPlayback(video: Ref<HTMLVideoElement | null>) {
  const route = useRoute();
  const router = useRouter();
  const queryClient = useQueryClient();
  const lessonState = ref<LessonDetailDto | null>(null);
  const courseState = ref<CourseDetailDto | null>(null);
  const loadingState = shallowRef(true);
  const endedState = shallowRef(false);
  const sidebarOpenState = shallowRef(false);
  const currentTimeState = shallowRef(0);
  const confirmation = useConfirm();
  const toast = useToast();
  const playbackProgress = usePlaybackProgress(async (lessonId, positionSeconds) => {
    await api.saveProgress(lessonId, positionSeconds);
    await invalidateProgressCaches(courseState.value?.id, lessonId);
  });
  const videoPlayback = useVideoPlayback(video, api);
  const retryAction = useAsyncAction(async (lessonId: string) => {
    await videoPlayback.retryPlayback(lessonId);
  });
  const resetAction = useAsyncAction(
    async (lessonId: string) => {
      if (lessonState.value?.id !== lessonId || !playbackProgress.isSessionFor(lessonId)) {
        return false;
      }
      await playbackProgress.resetSession(video.value?.currentTime, (lessonId) =>
        api.resetLesson(lessonId),
      );
      if (lessonState.value?.id !== lessonId || !playbackProgress.isSessionFor(lessonId)) {
        return false;
      }
      lessonState.value.positionSeconds = 0;
      lessonState.value.progressPercent = 0;
      lessonState.value.completed = false;
      endedState.value = false;
      if (video.value) video.value.currentTime = 0;
      return true;
    },
    {
      errorMessage: "Could not reset this video",
      onError: (caught) => {
        videoPlayback.error.value = apiErrorMessage(caught, "Could not reset this video");
      },
      onSuccess: async (reset) => {
        if (!reset) return;
        await invalidateProgressCaches(courseState.value?.id, lessonState.value?.id);
        toast.success("Video progress reset");
      },
    },
  );

  const allLessons = computed(
    () => courseState.value?.sections.flatMap((section) => section.videos) ?? [],
  );
  const currentIndex = computed(() =>
    allLessons.value.findIndex((video) => video.id === lessonState.value?.id),
  );
  const previousLesson = computed(() =>
    currentIndex.value > 0 ? allLessons.value.at(currentIndex.value - 1) : undefined,
  );
  const nextLesson = computed(() =>
    currentIndex.value >= 0 ? allLessons.value.at(currentIndex.value + 1) : undefined,
  );
  const mediaMetadata = computed(() => {
    if (!lessonState.value || !courseState.value) return null;
    return {
      title: lessonState.value.title,
      artist: courseState.value.authors.join(", ") || "Playlist",
      album: courseState.value.title,
      artwork: courseState.value.coverUrl,
    };
  });

  function invalidateCatalogCache(): Promise<void> {
    return queryClient.invalidateQueries({ queryKey: queryKeys.catalog, refetchType: "none" });
  }

  async function invalidateProgressCaches(
    courseId: string | undefined,
    lessonId: string | undefined,
  ): Promise<void> {
    const invalidations = [invalidateCatalogCache()];
    if (courseId) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.playlist(courseId),
          refetchType: "none",
        }),
      );
    }
    if (lessonId) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.video(lessonId),
          refetchType: "none",
        }),
      );
    }
    await Promise.all(invalidations);
  }

  function openLessonFromMediaSession(target: LessonDto | undefined): void {
    if (target) void router.push({ name: "player", params: { lessonId: target.id } });
  }

  useMediaSession(video, mediaMetadata, {
    previous: () => openLessonFromMediaSession(previousLesson.value),
    next: () => openLessonFromMediaSession(nextLesson.value),
  });
  useScreenWakeLock(video);
  usePauseVideoOnHidden(video);

  function destroyPlayback(): void {
    playbackProgress.clearSession();
    videoPlayback.clearSource();
  }

  function queryTimestamp(): number | null {
    if (typeof route.query.t !== "string" || route.query.t.trim() === "") return null;
    const seconds = Number(route.query.t);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
  }

  function normalizedSeekTime(element: HTMLVideoElement, startSeconds: number): number {
    return Number.isFinite(element.duration)
      ? Math.min(startSeconds, Math.max(0, element.duration - 0.001))
      : startSeconds;
  }

  function seekVideo(startSeconds: number): void {
    if (!video.value) return;
    video.value.currentTime = normalizedSeekTime(video.value, startSeconds);
    currentTimeState.value = video.value.currentTime;
  }

  async function loadPlayer(): Promise<void> {
    const requestId = videoPlayback.startRequest();
    if (endedState.value) playbackProgress.stopSession();
    else await playbackProgress.finishSession(video.value?.currentTime);
    if (!videoPlayback.isCurrentRequest(requestId)) return;
    destroyPlayback();
    loadingState.value = true;
    videoPlayback.error.value = "";
    endedState.value = false;
    currentTimeState.value = 0;
    sidebarOpenState.value = false;
    try {
      const lessonId = String(route.params.lessonId);
      const [detail, playback] = await Promise.all([
        queryClient.fetchQuery(lessonQueryOptions(lessonId)),
        api.preparePlayback(lessonId),
      ]);
      if (!videoPlayback.isCurrentRequest(requestId)) return;
      await api.openLesson(lessonId);
      await invalidateCatalogCache();
      if (!videoPlayback.isCurrentRequest(requestId)) return;
      lessonState.value = detail.video;
      setPageTitle(detail.video.title);
      playbackProgress.startSession(detail.video.id, detail.video.positionSeconds);
      courseState.value = detail.playlist;
      queryClient.setQueryData(queryKeys.playlist(detail.playlist.id), detail.playlist);
      await videoPlayback.applyPlayback(playback, lessonId, requestId);
    } catch (caught) {
      if (!videoPlayback.isCurrentRequest(requestId)) return;
      if (isCatalogResourceNotFound(caught)) {
        await router.replace(notFoundLocation(route.path));
        return;
      }
      videoPlayback.error.value = apiErrorMessage(caught, "Could not load this video");
    } finally {
      if (videoPlayback.isCurrentRequest(requestId)) loadingState.value = false;
    }
  }

  function applyResume(): void {
    videoPlayback.applyMetadata((element) => {
      if (!lessonState.value || !playbackProgress.isSessionFor(lessonState.value.id)) {
        return;
      }
      const timestamp = queryTimestamp();
      if (timestamp !== null) {
        element.currentTime = normalizedSeekTime(element, timestamp);
      } else if (!lessonState.value.completed && lessonState.value.positionSeconds > 0) {
        element.currentTime = Math.min(
          lessonState.value.positionSeconds,
          Math.max(0, element.duration - 1),
        );
      }
      currentTimeState.value = element.currentTime;
      playbackProgress.activateSession(element.currentTime);
    });
  }

  function saveOnTimeUpdate(): void {
    currentTimeState.value = video.value?.currentTime ?? 0;
    playbackProgress.recordPosition(video.value?.currentTime);
    if (!endedState.value) void playbackProgress.persistProgress();
  }

  function seekToChapter(startSeconds: number): void {
    seekVideo(startSeconds);
    void router.replace({ query: { ...route.query, t: String(startSeconds) } });
  }

  function saveOnPause(): void {
    playbackProgress.recordPosition(video.value?.currentTime);
    if (!endedState.value) void playbackProgress.persistProgress(true);
  }

  function saveOnExit(): void {
    if (endedState.value) return;
    const snapshot = playbackProgress.captureExitSnapshot(video.value?.currentTime);
    if (!snapshot) return;
    void fetch(`/api/progress/videos/${snapshot.lessonId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ positionSeconds: snapshot.positionSeconds }),
      keepalive: true,
    });
  }

  async function markComplete(): Promise<void> {
    if (!lessonState.value) return;
    const lessonId = lessonState.value.id;
    try {
      await api.completeLesson(lessonId);
      await invalidateProgressCaches(courseState.value?.id, lessonId);
      endedState.value = true;
      playbackProgress.stopSession();
      lessonState.value.completed = true;
      lessonState.value.progressPercent = 100;
    } catch (caught) {
      videoPlayback.error.value = apiErrorMessage(caught, "Could not complete this video");
    }
  }

  async function retryConversion(): Promise<void> {
    if (lessonState.value) await retryAction.run(lessonState.value.id);
  }

  async function resetProgress(): Promise<void> {
    if (!lessonState.value) return;
    const targetLessonId = lessonState.value.id;
    const confirmed = await confirmation.confirm({
      title: "Reset video progress?",
      message: "Your saved position and completion state for this video will be removed.",
      confirmLabel: "Reset video",
      variant: "danger",
    });
    if (!confirmed || lessonState.value?.id !== targetLessonId) return;
    await resetAction.run(targetLessonId);
  }

  function handleVisibility(): void {
    if (document.visibilityState !== "hidden") return;
    playbackProgress.recordPosition(video.value?.currentTime);
    if (!endedState.value) void playbackProgress.persistProgress(true);
  }

  function toggleSidebar(): void {
    sidebarOpenState.value = !sidebarOpenState.value;
  }

  function closeSidebar(): void {
    sidebarOpenState.value = false;
  }

  watch(
    () => route.params.lessonId,
    () => void loadPlayer(),
    { immediate: true },
  );
  watch(
    () => route.query.t,
    () => {
      const timestamp = queryTimestamp();
      if (timestamp !== null && video.value?.readyState) seekVideo(timestamp);
    },
  );
  window.addEventListener("pagehide", saveOnExit);
  document.addEventListener("visibilitychange", handleVisibility);

  onBeforeUnmount(() => {
    if (endedState.value) playbackProgress.stopSession();
    else void playbackProgress.finishSession(video.value?.currentTime);
    playbackProgress.clearSession();
    videoPlayback.disposePlayback();
    window.removeEventListener("pagehide", saveOnExit);
    document.removeEventListener("visibilitychange", handleVisibility);
  });

  return {
    applyResume,
    closeSidebar,
    playlist: computed(() => courseState.value),
    currentTime: computed(() => currentTimeState.value),
    ended: computed(() => endedState.value),
    error: computed(() => videoPlayback.error.value),
    video: computed(() => lessonState.value),
    loading: computed(() => loadingState.value),
    markComplete,
    nextLesson,
    playback: computed(() => videoPlayback.playback.value),
    resetProgress,
    resetting: computed(() => resetAction.pending.value),
    retryConversion,
    retrying: computed(() => retryAction.pending.value),
    saveOnPause,
    saveOnTimeUpdate,
    seekToChapter,
    sidebarOpen: computed(() => sidebarOpenState.value),
    toggleSidebar,
  };
}
