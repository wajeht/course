// @vitest-environment happy-dom

import { nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PlaybackResult } from "@/api.js";
import { useVideoPlayback } from "./useVideoPlayback.js";

function videoElement() {
  const element = document.createElement("video");
  vi.spyOn(element, "canPlayType").mockReturnValue("");
  vi.spyOn(element, "load").mockImplementation(() => undefined);
  vi.spyOn(element, "pause").mockImplementation(() => undefined);
  vi.spyOn(element, "removeAttribute");
  return element;
}

function playbackClient(result: PlaybackResult = { kind: "direct", url: "/media/lesson" }) {
  return {
    preparePlayback: vi.fn(async () => result),
    getConversionStatus: vi.fn(async () => result),
    retryConversion: vi.fn(async () => result),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("useVideoPlayback", () => {
  it("attaches a direct source for the current request", async () => {
    const element = videoElement();
    const client = playbackClient();
    const video = ref<HTMLVideoElement | null>(element);
    const playback = useVideoPlayback(video, client);
    const requestId = playback.startRequest();

    await playback.preparePlayback("lesson", requestId);

    expect(element.getAttribute("src")).toBe("/media/lesson");
    expect(element.load).toHaveBeenCalledOnce();
    expect(playback.playback.value).toEqual({ kind: "direct", url: "/media/lesson" });
  });

  it("does not attach a source from a stale request", async () => {
    let resolvePlayback: ((result: PlaybackResult) => void) | undefined;
    const request = new Promise<PlaybackResult>((resolve) => {
      resolvePlayback = resolve;
    });
    const element = videoElement();
    const client = playbackClient();
    client.preparePlayback.mockReturnValueOnce(request);
    const playback = useVideoPlayback(ref(element), client);
    const requestId = playback.startRequest();

    const preparation = playback.preparePlayback("lesson", requestId);
    playback.startRequest();
    resolvePlayback?.({ kind: "direct", url: "/media/stale" });
    await preparation;

    expect(element.getAttribute("src")).toBeNull();
    expect(element.load).not.toHaveBeenCalled();
  });

  it("polls a conversion until playback is available", async () => {
    vi.useFakeTimers();
    const element = videoElement();
    const client = playbackClient({ kind: "converting", status: "queued", progress: 0 });
    client.getConversionStatus.mockResolvedValueOnce({ kind: "direct", url: "/media/ready" });
    const playback = useVideoPlayback(ref(element), client, 100);
    const requestId = playback.startRequest();

    await playback.preparePlayback("lesson", requestId);
    await vi.advanceTimersByTimeAsync(100);
    await nextTick();

    expect(client.getConversionStatus).toHaveBeenCalledWith("lesson");
    expect(element.getAttribute("src")).toBe("/media/ready");
  });

  it("applies resume metadata once for each source", async () => {
    const element = videoElement();
    const playback = useVideoPlayback(ref(element), playbackClient());
    const callback = vi.fn();
    const requestId = playback.startRequest();
    await playback.preparePlayback("lesson", requestId);

    playback.applyMetadata(callback);
    playback.applyMetadata(callback);
    expect(callback).toHaveBeenCalledOnce();

    playback.clearSource();
    playback.applyMetadata(callback);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("invalidates requests and tears down the media element", () => {
    const element = videoElement();
    const playback = useVideoPlayback(ref(element), playbackClient());
    const requestId = playback.startRequest();

    playback.disposePlayback();

    expect(playback.isCurrentRequest(requestId)).toBe(false);
    expect(element.pause).toHaveBeenCalledOnce();
    expect(element.removeAttribute).toHaveBeenCalledWith("src");
    expect(element.load).toHaveBeenCalledOnce();
  });
});
