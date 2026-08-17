// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useScreenWakeLock } from "./useScreenWakeLock.js";

describe("useScreenWakeLock", () => {
  afterEach(() => vi.restoreAllMocks());

  it("holds a wake lock only while video is playing", async () => {
    const release = vi.fn(async () => undefined);
    const request = vi.fn(async () => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onrelease: null,
      release,
      released: false,
      removeEventListener: vi.fn(),
    }));
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: { request },
    });
    const wrapper = mount(
      defineComponent({
        template: "<video ref='video' />",
        setup() {
          const video = ref<HTMLVideoElement | null>(null);
          useScreenWakeLock(video);
          return { video };
        },
      }),
    );
    const video = wrapper.get("video").element as HTMLVideoElement;
    let paused = true;
    Object.defineProperty(video, "paused", { configurable: true, get: () => paused });

    paused = false;
    video.dispatchEvent(new Event("play"));
    await vi.waitFor(() => expect(request).toHaveBeenCalledWith("screen"));

    paused = true;
    video.dispatchEvent(new Event("pause"));
    await vi.waitFor(() => expect(release).toHaveBeenCalledOnce());
    wrapper.unmount();
  });
});
