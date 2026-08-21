import { useQueryClient } from "@tanstack/vue-query";
import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  api,
  apiErrorMessage,
  isLibraryResourceNotFound,
  type PlaylistDetailDto,
  type VideoDetailDto,
  type VideoDto,
} from "@/api.js";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useConfirm } from "@/composables/useConfirm.js";
import { useMediaSession } from "@/composables/useMediaSession.js";
import { usePauseVideoOnHidden } from "@/composables/usePauseVideoOnHidden.js";
import { usePlaybackProgress } from "@/composables/usePlaybackProgress.js";
import { useScreenWakeLock } from "@/composables/useScreenWakeLock.js";
import { useToast } from "@/composables/useToast.js";
import { useVideoPlayback } from "@/composables/useVideoPlayback.js";
import { queryKeys, videoQueryOptions } from "@/queries.js";
import { notFoundLocation } from "@/router.js";
import { setPageTitle } from "@/utils.js";

export function useVideoPlayer(element: Ref<HTMLVideoElement | null>) {
  const route = useRoute();
  const router = useRouter();
  const queryClient = useQueryClient();
  const video = ref<VideoDetailDto | null>(null);
  const playlist = ref<PlaylistDetailDto | null>(null);
  const loading = shallowRef(true);
  const ended = shallowRef(false);
  const sidebarOpen = shallowRef(false);
  const currentTime = shallowRef(0);
  const confirmation = useConfirm();
  const toast = useToast();
  const playback = useVideoPlayback(element, api);
  const progress = usePlaybackProgress(async (videoId, positionSeconds) => {
    await api.saveProgress(videoId, positionSeconds);
    await invalidateProgress(video.value?.playlistId, videoId);
  });
  const retry = useAsyncAction(async (videoId: string) => playback.retryPlayback(videoId));
  const reset = useAsyncAction(
    async (videoId: string) => {
      if (video.value?.id !== videoId || !progress.isSessionFor(videoId)) return false;
      await progress.resetSession(element.value?.currentTime, (id) => api.resetVideo(id));
      if (video.value?.id !== videoId) return false;
      video.value.positionSeconds = 0;
      video.value.progressPercent = 0;
      video.value.completed = false;
      ended.value = false;
      if (element.value) element.value.currentTime = 0;
      return true;
    },
    {
      errorMessage: "Could not reset this video",
      onSuccess: async (didReset) => {
        if (!didReset) return;
        await invalidateProgress(video.value?.playlistId, video.value?.id);
        toast.success("Video progress reset");
      },
    },
  );

  const playlistVideos = computed(
    () => playlist.value?.sections.flatMap((section) => section.videos) ?? [],
  );
  const currentIndex = computed(() =>
    playlistVideos.value.findIndex((item) => item.id === video.value?.id),
  );
  const previousVideo = computed(() =>
    currentIndex.value > 0 ? playlistVideos.value[currentIndex.value - 1] : undefined,
  );
  const nextVideo = computed(() =>
    currentIndex.value >= 0 ? playlistVideos.value[currentIndex.value + 1] : undefined,
  );
  const mediaMetadata = computed(() =>
    video.value
      ? {
          title: video.value.title,
          artist: video.value.authors.join(", ") || "Videos",
          album: playlist.value?.title ?? "Videos",
          artwork: video.value.coverUrl ?? playlist.value?.coverUrl ?? null,
        }
      : null,
  );

  function invalidateLibrary() {
    return queryClient.invalidateQueries({ queryKey: queryKeys.library, refetchType: "none" });
  }
  async function invalidateProgress(playlistId?: string | null, videoId?: string) {
    const requests: Promise<unknown>[] = [invalidateLibrary()];
    if (playlistId)
      requests.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.playlist(playlistId),
          refetchType: "none",
        }),
      );
    if (videoId)
      requests.push(
        queryClient.invalidateQueries({ queryKey: queryKeys.video(videoId), refetchType: "none" }),
      );
    await Promise.all(requests);
  }
  function navigate(target: VideoDto | undefined) {
    if (target) void router.push({ name: "player", params: { videoId: target.id } });
  }

  useMediaSession(element, mediaMetadata, {
    previous: () => navigate(previousVideo.value),
    next: () => navigate(nextVideo.value),
  });
  useScreenWakeLock(element);
  usePauseVideoOnHidden(element);

  function queryTimestamp(): number | null {
    if (typeof route.query.t !== "string" || !route.query.t.trim()) return null;
    const seconds = Number(route.query.t);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
  }
  function seek(seconds: number) {
    if (!element.value) return;
    element.value.currentTime = Number.isFinite(element.value.duration)
      ? Math.min(seconds, Math.max(0, element.value.duration - 0.001))
      : seconds;
    currentTime.value = element.value.currentTime;
  }

  async function loadPlayer() {
    const requestId = playback.startRequest();
    if (ended.value) progress.stopSession();
    else await progress.finishSession(element.value?.currentTime);
    if (!playback.isCurrentRequest(requestId)) return;
    progress.clearSession();
    playback.clearSource();
    loading.value = true;
    playback.error.value = "";
    ended.value = false;
    currentTime.value = 0;
    sidebarOpen.value = false;
    try {
      const videoId = String(route.params.videoId);
      const [detail, playbackResult] = await Promise.all([
        queryClient.fetchQuery(videoQueryOptions(videoId)),
        api.preparePlayback(videoId),
      ]);
      if (!playback.isCurrentRequest(requestId)) return;
      await api.openVideo(videoId);
      await invalidateLibrary();
      if (!playback.isCurrentRequest(requestId)) return;
      video.value = detail.video;
      playlist.value = detail.playlist;
      setPageTitle(detail.video.title);
      progress.startSession(detail.video.id, detail.video.positionSeconds);
      if (detail.playlist)
        queryClient.setQueryData(queryKeys.playlist(detail.playlist.id), detail.playlist);
      await playback.applyPlayback(playbackResult, videoId, requestId);
    } catch (caught) {
      if (!playback.isCurrentRequest(requestId)) return;
      if (isLibraryResourceNotFound(caught)) {
        await router.replace(notFoundLocation(route.path));
        return;
      }
      playback.error.value = apiErrorMessage(caught, "Could not load this video");
    } finally {
      if (playback.isCurrentRequest(requestId)) loading.value = false;
    }
  }

  function applyResume() {
    playback.applyMetadata((media) => {
      if (!video.value || !progress.isSessionFor(video.value.id)) return;
      const timestamp = queryTimestamp();
      if (timestamp !== null)
        media.currentTime = Math.min(timestamp, Math.max(0, media.duration - 0.001));
      else if (!video.value.completed && video.value.positionSeconds > 0)
        media.currentTime = Math.min(video.value.positionSeconds, Math.max(0, media.duration - 1));
      currentTime.value = media.currentTime;
      progress.activateSession(media.currentTime);
    });
  }
  function onTimeUpdate() {
    currentTime.value = element.value?.currentTime ?? 0;
    progress.recordPosition(element.value?.currentTime);
    if (!ended.value) void progress.persistProgress();
  }
  function onPause() {
    progress.recordPosition(element.value?.currentTime);
    if (!ended.value) void progress.persistProgress(true);
  }
  function saveOnExit() {
    if (ended.value) return;
    const snapshot = progress.captureExitSnapshot(element.value?.currentTime);
    if (!snapshot) return;
    void fetch(`/api/progress/videos/${snapshot.videoId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ positionSeconds: snapshot.positionSeconds }),
      keepalive: true,
    });
  }
  async function markComplete() {
    if (!video.value) return;
    try {
      await api.completeVideo(video.value.id);
      await invalidateProgress(video.value.playlistId, video.value.id);
      ended.value = true;
      progress.stopSession();
      video.value.completed = true;
      video.value.progressPercent = 100;
    } catch (caught) {
      playback.error.value = apiErrorMessage(caught, "Could not complete this video");
    }
  }
  async function resetProgress() {
    if (!video.value) return;
    const id = video.value.id;
    const confirmed = await confirmation.confirm({
      title: "Reset video progress?",
      message: "Your saved position and completion state for this video will be removed.",
      confirmLabel: "Reset video",
      variant: "danger",
    });
    if (confirmed && video.value?.id === id) await reset.run(id);
  }
  function handleVisibility() {
    if (document.visibilityState !== "hidden") return;
    progress.recordPosition(element.value?.currentTime);
    if (!ended.value) void progress.persistProgress(true);
  }

  watch(
    () => route.params.videoId,
    () => void loadPlayer(),
    { immediate: true },
  );
  watch(
    () => route.query.t,
    () => {
      const timestamp = queryTimestamp();
      if (timestamp !== null && element.value?.readyState) seek(timestamp);
    },
  );
  window.addEventListener("pagehide", saveOnExit);
  document.addEventListener("visibilitychange", handleVisibility);
  onBeforeUnmount(() => {
    if (ended.value) progress.stopSession();
    else void progress.finishSession(element.value?.currentTime);
    progress.clearSession();
    playback.disposePlayback();
    window.removeEventListener("pagehide", saveOnExit);
    document.removeEventListener("visibilitychange", handleVisibility);
  });

  return {
    applyResume,
    closeSidebar: () => {
      sidebarOpen.value = false;
    },
    currentTime: computed(() => currentTime.value),
    ended: computed(() => ended.value),
    error: computed(() => playback.error.value),
    loading: computed(() => loading.value),
    markComplete,
    nextVideo,
    onPause,
    onTimeUpdate,
    playback: computed(() => playback.playback.value),
    playlist: computed(() => playlist.value),
    resetProgress,
    resetting: computed(() => reset.pending.value),
    retryConversion: async () => {
      if (video.value) await retry.run(video.value.id);
    },
    retrying: computed(() => retry.pending.value),
    seekToChapter: (seconds: number) => {
      seek(seconds);
      void router.replace({ query: { ...route.query, t: String(seconds) } });
    },
    sidebarOpen: computed(() => sidebarOpen.value),
    toggleSidebar: () => {
      sidebarOpen.value = !sidebarOpen.value;
    },
    video: computed(() => video.value),
  };
}
