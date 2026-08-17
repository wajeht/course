// @vitest-environment happy-dom

import { mount, RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import UnexpectedErrorPage from "./UnexpectedErrorPage.vue";

describe("UnexpectedErrorPage", () => {
  it("hides technical details and offers reload and home actions", () => {
    const wrapper = mount(UnexpectedErrorPage, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });

    expect(wrapper.get("h1").text()).toBe("Something went wrong");
    expect(wrapper.get("main").classes()).toContain("min-h-screen");
    expect(wrapper.text()).toContain("Reload page");
    expect(wrapper.getComponent(RouterLinkStub).props("to")).toBe("/");
  });
});
