import { onScopeDispose, watch, type ComputedRef, type Ref } from "vue";

export interface CourseMediaMetadata {
  album: string;
  artist: string;
  artwork?: string | null;
  title: string;
}

interface MediaSessionNavigation {
  next?: () => void;
  previous?: () => void;
}

const actions: MediaSessionAction[] = [
  "play",
  "pause",
  "seekbackward",
  "seekforward",
  "seekto",
  "previoustrack",
  "nexttrack",
];

export function useMediaSession(
  video: Ref<HTMLVideoElement | null>,
  metadata: ComputedRef<CourseMediaMetadata | null>,
  navigation: MediaSessionNavigation = {},
): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  const session = navigator.mediaSession;
  let attachedVideo: HTMLVideoElement | null = null;

  function setHandler(action: MediaSessionAction, handler: MediaSessionActionHandler | null): void {
    try {
      session.setActionHandler(action, handler);
    } catch {
      // Some browsers expose Media Session while omitting individual actions.
    }
  }

  function updatePosition(): void {
    const element = video.value;
    if (!element) return;
    session.playbackState = element.paused ? "paused" : "playing";
    if (!Number.isFinite(element.duration) || element.duration <= 0) return;
    try {
      session.setPositionState({
        duration: element.duration,
        playbackRate: element.playbackRate || 1,
        position: Math.min(element.duration, Math.max(0, element.currentTime)),
      });
    } catch {
      // Position state is an enhancement and may be rejected during source changes.
    }
  }

  function seek(offset: number): void {
    const element = video.value;
    if (!element) return;
    element.currentTime = Math.min(
      Number.isFinite(element.duration) ? element.duration : Number.POSITIVE_INFINITY,
      Math.max(0, element.currentTime + offset),
    );
    updatePosition();
  }

  setHandler("play", () => void video.value?.play());
  setHandler("pause", () => video.value?.pause());
  setHandler("seekbackward", (details) => seek(-(details.seekOffset ?? 10)));
  setHandler("seekforward", (details) => seek(details.seekOffset ?? 10));
  setHandler("seekto", (details) => {
    const element = video.value;
    if (!element || details.seekTime === undefined) return;
    if (details.fastSeek && "fastSeek" in element) element.fastSeek(details.seekTime);
    else element.currentTime = details.seekTime;
    updatePosition();
  });
  setHandler("previoustrack", () => navigation.previous?.());
  setHandler("nexttrack", () => navigation.next?.());

  const removeVideoListeners = (): void => {
    if (!attachedVideo) return;
    for (const event of ["durationchange", "ended", "pause", "play", "ratechange", "timeupdate"]) {
      attachedVideo.removeEventListener(event, updatePosition);
    }
    attachedVideo = null;
  };

  watch(
    video,
    (element) => {
      removeVideoListeners();
      attachedVideo = element;
      if (!element) return;
      for (const event of [
        "durationchange",
        "ended",
        "pause",
        "play",
        "ratechange",
        "timeupdate",
      ]) {
        element.addEventListener(event, updatePosition);
      }
      updatePosition();
    },
    { immediate: true },
  );

  watch(
    metadata,
    (value) => {
      if (!value || typeof MediaMetadata === "undefined") {
        session.metadata = null;
        return;
      }
      session.metadata = new MediaMetadata({
        title: value.title,
        artist: value.artist,
        album: value.album,
        artwork: value.artwork ? [{ src: value.artwork }] : [],
      });
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    removeVideoListeners();
    for (const action of actions) setHandler(action, null);
    session.metadata = null;
    session.playbackState = "none";
  });
}
