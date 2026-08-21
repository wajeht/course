// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import PlayerVideoStage from "./PlayerVideoStage.vue";

function queryPlugin(): [typeof VueQueryPlugin, { queryClient: QueryClient }] {
  return [VueQueryPlugin, { queryClient: new QueryClient() }];
}

describe("PlayerVideoStage", () => {
  it("announces lesson preparation as a status", () => {
    const wrapper = mount(PlayerVideoStage, {
      props: {
        course: null,
        ended: false,
        error: "",
        loading: true,
        playback: null,
        retrying: false,
      },
      global: { plugins: [queryPlugin()] },
    });

    expect(wrapper.get('[role="status"]').text()).toContain("Preparing lesson…");
  });

  it("announces video conversion progress as a status", () => {
    const wrapper = mount(PlayerVideoStage, {
      props: {
        course: null,
        ended: false,
        error: "",
        loading: false,
        playback: { kind: "converting", status: "converting", progress: 42 },
        retrying: false,
      },
      global: { plugins: [queryPlugin()] },
    });

    expect(wrapper.get('[role="status"]').text()).toContain("42% complete");
  });
});
