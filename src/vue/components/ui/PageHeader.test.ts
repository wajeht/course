// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import PageHeader from "./PageHeader.vue";

describe("PageHeader", () => {
  it("renders the requested heading level and aside", () => {
    const wrapper = mount(PageHeader, {
      props: { eyebrow: "Library", headingLevel: 2, title: "All courses" },
      slots: { aside: "Up to date" },
    });

    expect(wrapper.get("h2").text()).toBe("All courses");
    expect(wrapper.text()).toContain("Up to date");
  });
});
