// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import EmptyState from "./EmptyState.vue";

describe("EmptyState", () => {
  it("renders its content and optional slots", () => {
    const wrapper = mount(EmptyState, {
      props: { title: "Nothing here", description: "Add a course.", headingLevel: 1 },
      slots: { actions: "Action", icon: "⌁" },
    });

    expect(wrapper.get("h1").text()).toBe("Nothing here");
    expect(wrapper.text()).toContain("Add a course.");
    expect(wrapper.text()).toContain("Action");
  });
});
