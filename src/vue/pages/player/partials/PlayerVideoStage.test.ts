// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import PlayerVideoStage from "./PlayerVideoStage.vue";

describe("PlayerVideoStage", () => {
  it("uses the selected image as the native video poster", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = mount(PlayerVideoStage, {
      props: {
        ended: false,
        error: "",
        loading: false,
        playback: { kind: "direct", url: "/media/video" },
        poster: "/covers/chapter.jpg",
        retrying: false,
      },
      global: { plugins: [[VueQueryPlugin, { queryClient }]] },
    });

    expect(wrapper.get("video").attributes("poster")).toBe("/covers/chapter.jpg");
  });
});
