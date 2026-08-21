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
  const video = wrapper.get("video").element as HTMLVideoElement;
  Object.defineProperty(video, "paused", { configurable: true, value: false });
  const pause = vi.spyOn(video, "pause").mockImplementation(() => undefined);
  return { pause, video, wrapper };
}

describe("usePauseVideoOnHidden", () => {
  beforeEach(() => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  });

  afterEach(() => {
    Reflect.deleteProperty(document, "pictureInPictureElement");
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
});
