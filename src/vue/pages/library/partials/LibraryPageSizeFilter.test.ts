// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import LibraryPageSizeFilter from "./LibraryPageSizeFilter.vue";

describe("LibraryPageSizeFilter", () => {
  it("updates the selected page size immediately", async () => {
    const wrapper = mount(LibraryPageSizeFilter, {
      props: { modelValue: 24 },
    });

    expect(wrapper.get("legend").text()).toBe("Videos per page");
    expect(wrapper.get<HTMLInputElement>('input[value="24"]').element.checked).toBe(true);

    await wrapper.get('input[value="48"]').setValue();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([48]);
  });

  it("disables the options and shows save errors", () => {
    const wrapper = mount(LibraryPageSizeFilter, {
      props: {
        disabled: true,
        error: "Could not save library settings",
        hideLabel: true,
        modelValue: 24,
      },
    });

    expect(wrapper.get("legend").classes()).toContain("sr-only");
    expect(wrapper.get("fieldset").attributes("disabled")).toBeDefined();
    expect(wrapper.get('[role="alert"]').text()).toBe("Could not save library settings");
  });
});
