// @vitest-environment happy-dom

import { mount, RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import NotFoundPage from "./NotFoundPage.vue";

describe("NotFoundPage", () => {
  it("explains the missing page and offers safe destinations", () => {
    const wrapper = mount(NotFoundPage, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });

    expect(wrapper.get("h1").text()).toBe("Page not found");
    expect(wrapper.text()).toContain("404");
    expect(wrapper.findAllComponents(RouterLinkStub).map((link) => link.props("to"))).toEqual([
      "/",
      "/library",
    ]);
    expect(wrapper.get("main").classes()).toContain("min-h-[calc(100vh-66px)]");
  });

  it("fills the viewport when rendered without the application shell", () => {
    const wrapper = mount(NotFoundPage, {
      props: { standalone: true },
      global: { stubs: { RouterLink: RouterLinkStub } },
    });

    expect(wrapper.get("main").classes()).toContain("min-h-screen");
  });
});
