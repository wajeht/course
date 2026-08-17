// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AppFooter from "./AppFooter.vue";

describe("AppFooter", () => {
  it("links to the project owner and shows the current app version", () => {
    const wrapper = mount(AppFooter);
    const githubLink = wrapper.get('a[href="https://github.com/wajeht/course"]');

    expect(githubLink.text()).toBe("github");
    expect(githubLink.attributes("rel")).toBe("noreferrer");
    expect(wrapper.text()).toContain("© 2026 · github · v0.1.0");
  });
});
