import { onScopeDispose, watch, type Ref } from "vue";

export function useScreenWakeLock(video: Ref<HTMLVideoElement | null>): void {
  if (!("navigator" in globalThis) || !("wakeLock" in globalThis.navigator)) return;
  let attachedVideo: HTMLVideoElement | null = null;
  let sentinel: WakeLockSentinel | null = null;
  let disposed = false;
  let requesting = false;

  function shouldStayAwake(): boolean {
    return Boolean(
      !disposed && video.value && !video.value.paused && document.visibilityState === "visible",
    );
  }

  async function releaseSentinel(active: WakeLockSentinel): Promise<void> {
    try {
      if (!active.released) await active.release();
    } catch {
      // Wake lock cleanup is best-effort because the browser may release it first.
    }
  }

  async function request(): Promise<void> {
    if (!shouldStayAwake() || (sentinel && !sentinel.released) || requesting) return;
    sentinel = null;
    requesting = true;
    try {
      const acquired = await globalThis.navigator.wakeLock.request("screen");
      if (!shouldStayAwake()) {
        await releaseSentinel(acquired);
        return;
      }
      sentinel = acquired;
      acquired.addEventListener(
        "release",
        () => {
          if (sentinel === acquired) sentinel = null;
        },
        { once: true },
      );
    } catch {
      // Wake lock is optional and may be refused by the browser or operating system.
    } finally {
      requesting = false;
    }
  }

  async function release(): Promise<void> {
    const active = sentinel;
    sentinel = null;
    if (active) await releaseSentinel(active);
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
    disposed = true;
    detachVideo();
    document.removeEventListener("visibilitychange", update);
    void release();
  });
}
