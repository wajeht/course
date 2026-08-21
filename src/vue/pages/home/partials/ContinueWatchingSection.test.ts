// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ContinueWatchingSection from "./ContinueWatchingSection.vue";

describe("ContinueWatchingSection", () => {
  it("announces lesson loading accurately", () => {
    const queryClient = new QueryClient();
    const wrapper = mount(ContinueWatchingSection, {
      props: { lessons: [], loading: true },
      global: { plugins: [[VueQueryPlugin, { queryClient }]] },
    });

    expect(wrapper.get('[aria-label="Loading lessons"]').attributes("aria-label")).toBe(
      "Loading lessons",
    );
    expect(wrapper.find('[aria-label="Loading courses"]').exists()).toBe(false);
  });
});
