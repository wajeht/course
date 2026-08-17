// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import { api } from "@/api.js";
import { authKey } from "@/composables/useAuth.js";
import { confirmationKey } from "@/composables/useConfirm.js";
import { pwaInstallKey } from "@/composables/usePwaInstall.js";
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
        [pwaInstallKey as symbol]: {
          dispose: vi.fn(),
          initialize: vi.fn(),
          install: vi.fn(async () => true),
          state: {
            canInstall: true,
            installed: false,
            installing: false,
            iosInstructions: false,
          },
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
    expect(dataCard.get("[data-scan-controls]").classes()).toContain("flex-col");
    expect(wrapper.get("[data-library-display-form]").classes()).toContain("flex-col");
    const labelClasses = ["text-xs", "font-bold", "tracking-[.08em]", "text-pine", "uppercase"];
    expect(dataCard.get("[data-library-status] > p").classes()).toEqual(
      expect.arrayContaining(labelClasses),
    );
    expect(dataCard.get("[data-last-refresh] > p").classes()).toEqual(
      expect.arrayContaining(labelClasses),
    );
    const lastScan = dataCard.get('time[datetime="2026-08-12T00:00:00.000Z"]');
    expect(lastScan.element.parentElement?.textContent).toContain("Last refreshed");
    expect(lastScan.classes()).toEqual(expect.arrayContaining(["text-sm", "text-muted"]));
    expect(lastScan.classes()).not.toContain("text-pine");
    expect(lastScan.text()).not.toBe("");
    expect(wrapper.get("#settings-data-panel").text()).toContain("Courses per page");
    expect(wrapper.get("[data-pwa-install-card]").text()).toContain("Install Course");
    expect(wrapper.get("[data-settings-layout]").classes()).toContain("gap-[clamp(18px,2vw,30px)]");
    expect(wrapper.get("#settings-data-panel").classes()).toEqual(
      expect.arrayContaining(["grid", "gap-[clamp(18px,2vw,30px)]"]),
    );

    const mobileSignOut = wrapper.get("[data-mobile-sign-out]");
    expect(mobileSignOut.text()).toBe("Sign out");
    expect(mobileSignOut.classes()).toContain("h-10");
    expect(wrapper.get("[data-mobile-sign-out-container]").classes()).toEqual(
      expect.arrayContaining(["hidden", "max-[760px]:block"]),
    );
    const desktopSignOut = wrapper.get("[data-desktop-sign-out]");
    expect(desktopSignOut.text()).toBe("Sign out");
    expect(desktopSignOut.classes()).toContain("h-10");
    expect(wrapper.get("[data-desktop-sign-out-container]").classes()).toContain(
      "max-[760px]:hidden",
    );
    expect(wrapper.get("main").classes()).toEqual(
      expect.arrayContaining([
        "min-[601px]:flex",
        "min-[601px]:min-h-[calc(100vh-66px)]",
        "min-[601px]:flex-col",
        "min-[601px]:pb-10",
      ]),
    );
    const footer = wrapper.get("footer");
    expect(footer.text()).toContain("© 2026 · github · v0.1.0");
    expect(footer.classes()).toEqual(
      expect.arrayContaining(["mt-12", "min-[601px]:mt-auto", "min-[601px]:pt-12"]),
    );

    await wrapper.get("#settings-auth-tab").trigger("click");
    const authCard = wrapper.get("#settings-auth-panel > section");
    expect(authCard.get("header h2").text()).toBe("Access");
    expect(authCard.text()).toContain("Use at least 15 characters.");
    expect(authCard.get("[data-change-password]").classes()).toContain("mt-4");
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

  it("shows a failed refresh without exposing its technical error or stale counts", async () => {
    vi.mocked(api.getScanStatus).mockResolvedValueOnce({
      completedAt: "2026-08-12T00:00:00.000Z",
      courseCount: 12,
      error: "Video folder is unavailable",
      lessonCount: 215,
      startedAt: "2026-08-12T00:00:00.000Z",
      status: "failed",
      warnings: [],
    });
    const wrapper = mountSettings();
    await flushPromises();

    const dataPanel = wrapper.get("#settings-data-panel");
    expect(dataPanel.text()).toContain("Refresh failed");
    expect(dataPanel.text()).toContain(
      "The library could not be refreshed. Check that your video folder is available, then try again.",
    );
    expect(dataPanel.text()).toContain("Last refresh attempt");
    expect(dataPanel.text()).not.toContain("Video folder is unavailable");
    expect(dataPanel.text()).not.toContain("12 courses · 215 lessons");
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
