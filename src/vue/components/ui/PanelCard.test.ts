// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import PanelCard from "./PanelCard.vue";

describe("PanelCard", () => {
  it("supports semantic container elements", () => {
    const wrapper = mount(PanelCard, { props: { as: "article" }, slots: { default: "Body" } });

    expect(wrapper.element.tagName).toBe("ARTICLE");
    expect(wrapper.text()).toBe("Body");
  });

  it("can render a flat bordered surface", () => {
    const wrapper = mount(PanelCard, { props: { elevated: false } });

    expect(wrapper.classes()).toContain("border-line");
    expect(wrapper.classes()).not.toContain("shadow-playlist");
  });
});
