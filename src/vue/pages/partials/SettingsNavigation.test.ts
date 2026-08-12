// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SettingsNavigation from "./SettingsNavigation.vue";

describe("SettingsNavigation", () => {
  it("selects settings panels and keeps sign out separate", async () => {
    const wrapper = mount(SettingsNavigation, { props: { modelValue: "data" } });
    const sectionButtons = wrapper.findAll("button[aria-pressed]");

    expect(sectionButtons.map((button) => button.text())).toEqual(["Data", "Auth"]);
    expect(sectionButtons[0]?.attributes("aria-pressed")).toBe("true");
    expect(sectionButtons[1]?.attributes("aria-pressed")).toBe("false");
    expect(sectionButtons[0]?.classes()).toContain("bg-pine!");
    expect(sectionButtons[0]?.classes()).toContain("min-h-12");

    await sectionButtons[1]?.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["auth"]]);

    await wrapper.setProps({ modelValue: "auth" });
    expect(sectionButtons[1]?.classes()).toContain("bg-pine!");

    await wrapper.findAll("button").at(-1)?.trigger("click");
    expect(wrapper.emitted("signOut")).toHaveLength(1);
  });
});
