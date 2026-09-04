// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import EmptyState from "./EmptyState.vue";
import PanelCard from "./PanelCard.vue";

describe("EmptyState", () => {
  it("renders its content and optional slots", () => {
    const wrapper = mount(EmptyState, {
      props: { title: "Nothing here", description: "Add a video.", headingLevel: 1 },
      slots: { actions: "Action", details: "Server folder: /videos" },
    });

    expect(wrapper.get("h1").text()).toBe("Nothing here");
    expect(wrapper.text()).toContain("Add a video.");
    expect(wrapper.text()).toContain("Action");
    expect(wrapper.text()).toContain("Server folder: /videos");
  });

  it("can render an error state without an empty-state frame", () => {
    const wrapper = mount(EmptyState, {
      props: { title: "Page unavailable", framed: false },
    });

    expect(wrapper.get("section").classes()).not.toContain("border-dashed");
    expect(wrapper.findComponent(PanelCard).exists()).toBe(false);
  });
});
