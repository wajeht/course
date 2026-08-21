import { onScopeDispose, type Ref } from "vue";

export function usePauseVideoOnHidden(video: Ref<HTMLVideoElement | null>): void {
  function pauseVideo(): void {
    const element = video.value;
    if (
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
