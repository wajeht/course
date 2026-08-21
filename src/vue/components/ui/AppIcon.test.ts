// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AppIcon from "./AppIcon.vue";

describe("AppIcon", () => {
  it.each(["alert-circle", "chevron-right", "heart", "library", "play"] as const)(
    "renders the %s SVG icon",
    (name) => {
      const wrapper = mount(AppIcon, { props: { name } });

      expect(wrapper.element.tagName).toBe("svg");
      expect(wrapper.attributes("data-icon")).toBe(name);
      expect(wrapper.attributes("aria-hidden")).toBe("true");
      expect(wrapper.findAll("path").length).toBeGreaterThan(0);
    },
  );
});
