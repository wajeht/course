// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AlertMessage from "./AlertMessage.vue";

describe("AlertMessage", () => {
  it("announces its content as an alert", () => {
    const wrapper = mount(AlertMessage, { slots: { default: "Failed" } });

    expect(wrapper.attributes("role")).toBe("alert");
    expect(wrapper.text()).toBe("Failed");
  });

  it("supports the shared large message size", () => {
    const wrapper = mount(AlertMessage, {
      props: { size: "lg", variant: "info" },
      slots: { default: "Library updated" },
    });

    expect(wrapper.classes()).toContain("px-[18px]");
    expect(wrapper.attributes("role")).toBe("status");
  });
});
