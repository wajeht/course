// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SettingsNavigation from "./SettingsNavigation.vue";

describe("SettingsNavigation", () => {
  it("selects settings panels and keeps sign out separate", async () => {
    const wrapper = mount(SettingsNavigation, { props: { modelValue: "data" } });
    const tabs = wrapper.findAll('[role="tab"]');

    expect(tabs.map((tab) => tab.text())).toEqual(["Data", "Auth"]);
    expect(tabs[0]?.attributes("aria-selected")).toBe("true");
    expect(tabs[1]?.attributes("aria-selected")).toBe("false");
    expect(tabs[0]?.classes()).toContain("bg-pine!");
    expect(tabs[0]?.classes()).toContain("min-h-12");

    await tabs[1]?.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["auth"]]);

    await wrapper.setProps({ modelValue: "auth" });
    expect(tabs[1]?.classes()).toContain("bg-pine!");

    await wrapper.findAll("button").at(-1)?.trigger("click");
    expect(wrapper.emitted("signOut")).toHaveLength(1);
  });
});
