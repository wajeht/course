import { mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePauseVideoOnHidden } from "./usePauseVideoOnHidden.js";

function mountVideo() {
  const wrapper = mount(
    defineComponent({
      template: "<video ref='video' />",
      setup() {
        const video = ref<HTMLVideoElement | null>(null);
        usePauseVideoOnHidden(video);
        return { video };
      },
    }),
  );
  const video = wrapper.get<HTMLVideoElement>("video").element;
  Object.defineProperty(video, "paused", { configurable: true, value: false });
  const pause = vi.spyOn(video, "pause").mockImplementation(() => undefined);
  return { pause, video, wrapper };
}

describe("usePauseVideoOnHidden", () => {
  beforeEach(() => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Macintosh)");
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    vi.spyOn(navigator, "maxTouchPoints", "get").mockReturnValue(0);
  });

  afterEach(() => {
    Reflect.deleteProperty(document, "pictureInPictureElement");
    vi.restoreAllMocks();
  });

  it("pauses a playing video when the document becomes hidden", () => {
    const { pause, wrapper } = mountVideo();

    document.dispatchEvent(new Event("visibilitychange"));

    expect(pause).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("keeps a Picture-in-Picture video playing when the document becomes hidden", () => {
    const { pause, video, wrapper } = mountVideo();
    Object.defineProperty(document, "pictureInPictureElement", {
      configurable: true,
      value: video,
    });

    document.dispatchEvent(new Event("visibilitychange"));

    expect(pause).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it.each([
    {
      name: "iPhone",
      platform: "iPhone",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)",
    },
    {
      name: "Android",
      platform: "Linux armv8l",
      userAgent: "Mozilla/5.0 (Linux; Android 16; Pixel 10)",
    },
  ])("keeps video playing when $name becomes hidden", ({ platform, userAgent }) => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
    const { pause, wrapper } = mountVideo();

    document.dispatchEvent(new Event("visibilitychange"));

    expect(pause).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("keeps video playing on iPadOS when Safari uses its desktop identity", () => {
    vi.spyOn(navigator, "maxTouchPoints", "get").mockReturnValue(5);
    const { pause, wrapper } = mountVideo();

    document.dispatchEvent(new Event("visibilitychange"));

    expect(pause).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
