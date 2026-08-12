import { nextTick, ref, type Ref } from "vue";

import type { PlaybackResult } from "@/api.js";

interface PlaybackClient {
  preparePlayback(lessonId: string): Promise<PlaybackResult>;
  getConversionStatus(lessonId: string): Promise<PlaybackResult>;
  retryConversion(lessonId: string): Promise<PlaybackResult>;
}

export function useVideoPlayback(
  video: Ref<HTMLVideoElement | null>,
  client: PlaybackClient,
  pollMilliseconds = 2_000,
) {
  const playback = ref<PlaybackResult | null>(null);
  const error = ref("");
  let hls: import("hls.js").default | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let metadataApplied = false;
  let requestSequence = 0;

  function startRequest(): number {
    return ++requestSequence;
  }

  function isCurrentRequest(requestId: number): boolean {
    return requestId === requestSequence;
  }

  function clearSource(): void {
    clearTimeout(pollTimer);
    pollTimer = undefined;
    hls?.destroy();
    hls = null;
    metadataApplied = false;
    playback.value = null;
    if (video.value) {
      video.value.pause();
      video.value.removeAttribute("src");
      video.value.load();
    }
  }

  function disposePlayback(): void {
    requestSequence++;
    clearSource();
  }

  async function attachSource(
    url: string,
    kind: "direct" | "hls",
    requestId: number,
  ): Promise<void> {
    await nextTick();
    if (!isCurrentRequest(requestId)) return;
    const element = video.value;
    if (!element) return;
    hls?.destroy();
    hls = null;
    metadataApplied = false;

    if (kind === "direct" || element.canPlayType("application/vnd.apple.mpegurl")) {
      element.src = url;
      element.load();
      return;
    }
    const { default: Hls } = await import("hls.js/light");
    if (!isCurrentRequest(requestId)) return;
    if (!Hls.isSupported()) {
      error.value = "This browser cannot play the converted video.";
      return;
    }
    hls = new Hls({ enableWorker: true, backBufferLength: 30 });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal && isCurrentRequest(requestId)) {
        error.value = "Playback stopped because the video stream failed.";
      }
    });
    hls.loadSource(url);
    hls.attachMedia(element);
  }

  async function applyPlayback(
    result: PlaybackResult,
    lessonId: string,
    requestId: number,
  ): Promise<void> {
    if (!isCurrentRequest(requestId)) return;
    playback.value = result;
    if (result.kind === "direct") return attachSource(result.url, "direct", requestId);
    if (result.kind === "hls") return attachSource(result.url, "hls", requestId);
    if (result.kind === "error") {
      error.value = result.message;
      return;
    }
    pollTimer = setTimeout(async () => {
      try {
        const conversion = await client.getConversionStatus(lessonId);
        await applyPlayback(conversion, lessonId, requestId);
      } catch (caught) {
        if (!isCurrentRequest(requestId)) return;
        error.value = caught instanceof Error ? caught.message : "Could not check conversion";
      }
    }, pollMilliseconds);
  }

  async function preparePlayback(lessonId: string, requestId: number): Promise<void> {
    const preparedPlayback = await client.preparePlayback(lessonId);
    await applyPlayback(preparedPlayback, lessonId, requestId);
  }

  async function retryPlayback(lessonId: string): Promise<void> {
    error.value = "";
    const requestId = requestSequence;
    await applyPlayback(await client.retryConversion(lessonId), lessonId, requestId);
  }

  function applyMetadata(callback: (element: HTMLVideoElement) => void): void {
    const element = video.value;
    if (!element || metadataApplied) return;
    metadataApplied = true;
    callback(element);
  }

  return {
    applyMetadata,
    clearSource,
    disposePlayback,
    error,
    isCurrentRequest,
    playback,
    preparePlayback,
    retryPlayback,
    startRequest,
  };
}
