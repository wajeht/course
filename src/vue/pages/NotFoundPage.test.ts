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
  });
});
