import { onScopeDispose, watch, type Ref } from "vue";

export function useScreenWakeLock(video: Ref<HTMLVideoElement | null>): void {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
  let attachedVideo: HTMLVideoElement | null = null;
  let sentinel: WakeLockSentinel | null = null;
  let requesting = false;

  function shouldStayAwake(): boolean {
    return Boolean(video.value && !video.value.paused && document.visibilityState === "visible");
  }

  async function request(): Promise<void> {
    if (!shouldStayAwake() || sentinel || requesting) return;
    requesting = true;
    try {
      const acquired = await navigator.wakeLock.request("screen");
      if (shouldStayAwake()) sentinel = acquired;
      else await acquired.release();
    } catch {
      // Wake lock is optional and may be refused by the browser or operating system.
    } finally {
      requesting = false;
    }
  }

  async function release(): Promise<void> {
    const active = sentinel;
    sentinel = null;
    if (active && !active.released) await active.release();
  }

  function update(): void {
    if (shouldStayAwake()) void request();
    else void release();
  }

  function detachVideo(): void {
    if (!attachedVideo) return;
    for (const event of ["ended", "pause", "play"]) {
      attachedVideo.removeEventListener(event, update);
    }
    attachedVideo = null;
  }

  watch(
    video,
    (element) => {
      detachVideo();
      attachedVideo = element;
      if (!element) return;
      for (const event of ["ended", "pause", "play"]) {
        element.addEventListener(event, update);
      }
      update();
    },
    { immediate: true },
  );
  document.addEventListener("visibilitychange", update);

  onScopeDispose(() => {
    detachVideo();
    document.removeEventListener("visibilitychange", update);
    void release();
  });
}
