// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ContinueWatchingSection from "./ContinueWatchingSection.vue";

describe("ContinueWatchingSection", () => {
  it("announces video loading accurately", () => {
    const queryClient = new QueryClient();
    const wrapper = mount(ContinueWatchingSection, {
      props: { videos: [], loading: true },
      global: { plugins: [[VueQueryPlugin, { queryClient }]] },
    });

    expect(wrapper.get('[aria-label="Loading videos"]').attributes("aria-label")).toBe(
      "Loading videos",
    );
    expect(wrapper.get('[aria-label="Loading videos"]').attributes("role")).toBe("status");
  });
});
