// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import { authKey } from "@/composables/useAuth.js";
import { toastKey } from "@/composables/useToast.js";

import AccessPage from "./AccessPage.vue";

function mountAccessPage() {
  return mount(AccessPage, {
    global: {
      provide: {
        [authKey as symbol]: { changePassword: vi.fn() },
        [toastKey as symbol]: { success: vi.fn() },
      },
    },
  });
}

describe("settings/AccessPage", () => {
  it("renders only the access settings", () => {
    const wrapper = mountAccessPage();

    expect(wrapper.get("header h2").text()).toBe("Access");
    expect(wrapper.text()).toContain("Use at least 15 characters.");
    expect(wrapper.get("[data-change-password]").classes()).toContain("mt-4");
    expect(wrapper.find("[data-library-status]").exists()).toBe(false);
  });

  it("validates matching passwords before changing them", async () => {
    const wrapper = mountAccessPage();
    const inputs = wrapper.findAll('input[type="password"]');

    await inputs[0]?.setValue("current-password");
    await inputs[1]?.setValue("a-new-password-long-enough");
    await inputs[2]?.setValue("a-different-password");
    await wrapper.get("form").trigger("submit");

    expect(wrapper.text()).toContain("Passwords do not match");
  });
});
