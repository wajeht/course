// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import PageHeader from "./PageHeader.vue";

describe("PageHeader", () => {
  it("renders the requested heading level and aside", () => {
    const wrapper = mount(PageHeader, {
      props: { eyebrow: "Library", headingLevel: 2, title: "All playlists" },
      slots: { aside: "Up to date" },
    });

    expect(wrapper.get("h2").text()).toBe("All playlists");
    expect(wrapper.text()).toContain("Up to date");
  });

  it("omits the eyebrow when one is not provided", () => {
    const wrapper = mount(PageHeader, { props: { title: "Settings" } });

    expect(wrapper.get("h1").text()).toBe("Settings");
    expect(wrapper.find("p").exists()).toBe(false);
  });
});
