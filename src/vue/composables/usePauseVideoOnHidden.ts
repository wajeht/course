import { onScopeDispose, type Ref } from "vue";

const mobilePlatformPattern = /Android|iPad|iPhone|iPod/u;

function isMobilePlatform(): boolean {
  return (
    mobilePlatformPattern.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function usePauseVideoOnHidden(video: Ref<HTMLVideoElement | null>): void {
  const pauseWhenHidden = !isMobilePlatform();

  function pauseVideo(): void {
    const element = video.value;
    if (
      pauseWhenHidden &&
      document.visibilityState === "hidden" &&
      element &&
      !element.paused &&
      document.pictureInPictureElement !== element
    ) {
      element.pause();
    }
  }

  document.addEventListener("visibilitychange", pauseVideo);
  onScopeDispose(() => document.removeEventListener("visibilitychange", pauseVideo));
}
