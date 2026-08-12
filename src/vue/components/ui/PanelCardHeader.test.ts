// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import PanelCardHeader from "./PanelCardHeader.vue";

describe("PanelCardHeader", () => {
  it("renders a consistent title and description", () => {
    const wrapper = mount(PanelCardHeader, {
      props: { description: "Card details", title: "Card title" },
    });

    expect(wrapper.get("h2").text()).toBe("Card title");
    expect(wrapper.get("p").text()).toBe("Card details");
  });

  it("supports nested card heading levels", () => {
    const wrapper = mount(PanelCardHeader, {
      props: { headingLevel: 3, title: "Nested card" },
    });

    expect(wrapper.get("h3").text()).toBe("Nested card");
    expect(wrapper.find("p").exists()).toBe(false);
  });
});
