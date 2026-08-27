// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { computed, defineComponent, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMediaSession } from "./useMediaSession.js";

const handlers = new Map<MediaSessionAction, MediaSessionActionHandler | null>();
const setPositionState = vi.fn();
const session: MediaSession = {
  metadata: null,
  playbackState: "none",
  setActionHandler: vi.fn((action: MediaSessionAction, handler: MediaSessionActionHandler | null) =>
    handlers.set(action, handler),
  ),
  setPositionState,
};

class FakeMediaMetadata {
  album = "";
  artist = "";
  artwork: readonly MediaImage[] = [];
  title = "";

  constructor(value: MediaMetadataInit) {
    Object.assign(this, value);
  }
}

describe("useMediaSession", () => {
  afterEach(() => {
    handlers.clear();
    vi.restoreAllMocks();
    setPositionState.mockReset();
    session.metadata = null;
    session.playbackState = "none";
  });

  it("publishes video metadata and handles native media controls", async () => {
    Object.defineProperty(navigator, "mediaSession", { configurable: true, value: session });
    vi.stubGlobal("MediaMetadata", FakeMediaMetadata);
    const next = vi.fn();
    const wrapper = mount(
      defineComponent({
        template: "<video ref='video' />",
        setup() {
          const video = ref<HTMLVideoElement | null>(null);
          useMediaSession(
            video,
            computed(() => ({
              title: "Video one",
              artist: "Author",
              album: "Playlist name",
              artwork: "/cover.png",
            })),
            { next },
          );
          return { video };
        },
      }),
    );
    const video = wrapper.get<HTMLVideoElement>("video").element;
    Object.defineProperties(video, {
      currentTime: { configurable: true, value: 20, writable: true },
      duration: { configurable: true, value: 120 },
      paused: { configurable: true, value: false },
      playbackRate: { configurable: true, value: 1, writable: true },
    });
    vi.spyOn(video, "pause").mockImplementation(() => undefined);

    expect(session.metadata?.title).toBe("Video one");
    handlers.get("seekforward")?.({ action: "seekforward", seekOffset: 15 });
    expect(video.currentTime).toBe(35);
    handlers.get("pause")?.({ action: "pause" });
    expect(video.pause).toHaveBeenCalledOnce();
    handlers.get("nexttrack")?.({ action: "nexttrack" });
    expect(next).toHaveBeenCalledOnce();

    wrapper.unmount();
    expect(session.metadata).toBeNull();
    expect(handlers.get("play")).toBeNull();
    vi.unstubAllGlobals();
  });
});
