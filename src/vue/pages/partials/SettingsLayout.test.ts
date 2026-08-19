// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";

import { authKey } from "@/composables/useAuth.js";
import { confirmationKey } from "@/composables/useConfirm.js";

import SettingsLayout from "./SettingsLayout.vue";

async function mountSettingsLayout() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/settings/library", component: { template: "<div />" } },
      { path: "/settings/access", component: { template: "<div />" } },
    ],
  });
  await router.push("/settings/library");
  const request = vi.fn(async () => false);
  const wrapper = mount(SettingsLayout, {
    global: {
      plugins: [router],
      provide: {
        [authKey as symbol]: { logout: vi.fn() },
        [confirmationKey as symbol]: {
          accept: vi.fn(),
          active: shallowRef(null),
          cancel: vi.fn(),
          cancelOwner: vi.fn(),
          clear: vi.fn(),
          request,
        },
      },
      stubs: { RouterView: { template: '<section data-settings-page="" />' } },
    },
  });
  return { request, wrapper };
}

describe("SettingsLayout", () => {
  it("owns the shared settings page structure", async () => {
    const { request, wrapper } = await mountSettingsLayout();

    const pageHeader = wrapper.get("main > header");
    expect(pageHeader.get("h1").text()).toBe("Settings");
    expect(pageHeader.text()).toContain("Course settings");
    expect(wrapper.get('[aria-label="Settings sections"]').text()).toContain("LibraryAccess");
    expect(wrapper.get("[data-settings-page]").element.tagName).toBe("SECTION");
    expect(wrapper.get("[data-mobile-sign-out]").text()).toBe("Sign out");
    expect(wrapper.get("[data-desktop-sign-out]").text()).toBe("Sign out");
    expect(wrapper.get("footer").text()).toContain("© 2026 · GitHub · v0.1.0");

    await wrapper.get("[data-desktop-sign-out]").trigger("click");
    expect(request).toHaveBeenCalledOnce();
  });
});
