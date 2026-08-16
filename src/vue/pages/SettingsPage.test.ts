// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import { api } from "@/api.js";
import { authKey } from "@/composables/useAuth.js";
import { confirmationKey } from "@/composables/useConfirm.js";
import { toastKey } from "@/composables/useToast.js";

import SettingsPage from "./SettingsPage.vue";

vi.mock("@/api.js", () => ({
  api: {
    getScanStatus: vi.fn(async () => ({
      completedAt: "2026-08-12T00:00:00.000Z",
      courseCount: 12,
      error: null,
      lessonCount: 215,
      startedAt: "2026-08-12T00:00:00.000Z",
      status: "complete",
      warnings: [],
    })),
    getSettings: vi.fn(async () => ({ catalogPageSize: 24 })),
    rescanCatalog: vi.fn(),
    updateSettings: vi.fn(async (catalogPageSize) => ({ catalogPageSize })),
  },
}));

function mountSettings() {
  return mount(SettingsPage, {
    global: {
      provide: {
        [authKey as symbol]: {
          changePassword: vi.fn(),
          logout: vi.fn(),
        },
        [confirmationKey as symbol]: {
          active: { value: null },
          accept: vi.fn(),
          cancel: vi.fn(),
          cancelOwner: vi.fn(),
          clear: vi.fn(),
          request: vi.fn(),
        },
        [toastKey as symbol]: {
          success: vi.fn(),
        },
      },
    },
  });
}

describe("SettingsPage", () => {
  it("uses the shared page hierarchy and keeps section headings inside their cards", async () => {
    const wrapper = mountSettings();
    await flushPromises();

    const pageHeader = wrapper.get("main > header");
    expect(pageHeader.get("h1").text()).toBe("Settings");
    expect(pageHeader.text()).toContain("Course settings");
    expect(pageHeader.findAll("p")).toHaveLength(1);

    const dataCard = wrapper.get("#settings-data-panel > section");
    expect(dataCard.get("header h2").text()).toBe("Refresh library");
    expect(dataCard.text()).toContain("12 courses · 215 lessons");
    expect(wrapper.get("#settings-data-panel").text()).toContain("Courses per page");
    expect(wrapper.get("[data-settings-layout]").classes()).toContain("gap-[clamp(18px,2vw,30px)]");
    expect(wrapper.get("#settings-data-panel").classes()).toEqual(
      expect.arrayContaining(["grid", "gap-[clamp(18px,2vw,30px)]"]),
    );

    const mobileSignOut = wrapper.get("[data-mobile-sign-out]");
    expect(mobileSignOut.text()).toBe("Sign out");
    expect(wrapper.get("[data-mobile-sign-out-container]").classes()).toEqual(
      expect.arrayContaining(["hidden", "max-[760px]:block"]),
    );
    expect(wrapper.get("[data-desktop-sign-out]").text()).toBe("Sign out");
    expect(wrapper.get("[data-desktop-sign-out-container]").classes()).toContain(
      "max-[760px]:hidden",
    );

    await wrapper.get("#settings-auth-tab").trigger("click");
    const authCard = wrapper.get("#settings-auth-panel > section");
    expect(authCard.get("header h2").text()).toBe("Access");
    expect(authCard.text()).toContain("Use at least 15 characters.");
    expect(wrapper.get("[data-mobile-sign-out]").text()).toBe("Sign out");
  });

  it("shows actionable library issue details with correct singular wording", async () => {
    vi.mocked(api.getScanStatus).mockResolvedValueOnce({
      completedAt: "2026-08-12T00:00:00.000Z",
      courseCount: 1,
      error: null,
      lessonCount: 1,
      startedAt: "2026-08-12T00:00:00.000Z",
      status: "complete",
      warnings: [{ path: "Example/course.json", message: "Cover file is missing" }],
    });
    const wrapper = mountSettings();
    await flushPromises();

    const issues = wrapper.get('[aria-label="Library issues"]');
    expect(wrapper.get("#settings-data-panel").text()).toContain("1 library issue");
    expect(issues.text()).toContain("Example/course.json");
    expect(issues.text()).toContain("Cover file is missing");
  });

  it("disables library settings when their saved value cannot be loaded", async () => {
    vi.mocked(api.getSettings).mockRejectedValueOnce(new Error("Could not load settings"));
    vi.mocked(api.updateSettings).mockClear();
    const wrapper = mountSettings();
    await flushPromises();

    expect(wrapper.get("select").attributes("disabled")).toBeDefined();
    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeDefined();
    await wrapper.get("form").trigger("submit");
    expect(api.updateSettings).not.toHaveBeenCalled();
  });
});
