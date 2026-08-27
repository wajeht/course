// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/api.js";
import { toastKey } from "@/composables/useToast.js";

import LibraryPage from "./LibraryPage.vue";

vi.mock("@/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api.js")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getScanStatus: vi.fn(async () => ({
        completedAt: "2026-08-12T00:00:00.000Z",
        playlistCount: 12,
        error: null,
        videoCount: 215,
        startedAt: "2026-08-12T00:00:00.000Z",
        status: "complete",
        warnings: [],
      })),
      rescanLibrary: vi.fn(),
    },
  };
});

function mountLibraryPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return mount(LibraryPage, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient }]],
      provide: {
        [toastKey as symbol]: { success: vi.fn() },
      },
      stubs: { SettingsLayout: { template: "<slot />" } },
    },
  });
}

describe("settings/LibraryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders library status without display settings", async () => {
    const wrapper = mountLibraryPage();
    await flushPromises();

    const refreshCard = wrapper.get("#settings-library-panel > section");
    expect(refreshCard.get("header h2").text()).toBe("Refresh library");
    expect(refreshCard.text()).toContain("12 playlists · 215 videos");
    expect(refreshCard.get("[data-scan-controls]").classes()).toContain("flex-col");
    expect(wrapper.get("#settings-library-panel").text()).not.toContain("Videos per page");
    expect(wrapper.get("#settings-library-panel").classes()).toEqual(
      expect.arrayContaining(["grid", "gap-[clamp(18px,2vw,30px)]"]),
    );
    const lastRefresh = refreshCard.get('time[datetime="2026-08-12T00:00:00.000Z"]');
    expect(lastRefresh.element.parentElement?.textContent).toContain("Last refreshed");
    expect(lastRefresh.text()).not.toBe("");
  });

  it("shows actionable library issue details with correct singular wording", async () => {
    vi.mocked(api.getScanStatus).mockResolvedValueOnce({
      completedAt: "2026-08-12T00:00:00.000Z",
      playlistCount: 1,
      error: null,
      videoCount: 1,
      startedAt: "2026-08-12T00:00:00.000Z",
      status: "complete",
      warnings: [{ path: "Example/playlist.json", message: "Cover file is missing" }],
    });
    const wrapper = mountLibraryPage();
    await flushPromises();

    const issues = wrapper.get('[aria-label="Library issues"]');
    expect(wrapper.text()).toContain("1 library issue");
    expect(issues.text()).toContain("Example/playlist.json");
    expect(issues.text()).toContain("Cover file is missing");
  });

  it("shows a failed refresh without exposing its technical error or stale counts", async () => {
    vi.mocked(api.getScanStatus).mockResolvedValueOnce({
      completedAt: "2026-08-12T00:00:00.000Z",
      playlistCount: 12,
      error: "Video folder is unavailable",
      videoCount: 215,
      startedAt: "2026-08-12T00:00:00.000Z",
      status: "failed",
      warnings: [],
    });
    const wrapper = mountLibraryPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Refresh failed");
    expect(wrapper.text()).toContain(
      "The library could not be refreshed. Check that your video folder is available, then try again.",
    );
    expect(wrapper.text()).not.toContain("Video folder is unavailable");
    expect(wrapper.text()).not.toContain("12 playlists · 215 videos");
  });

  it("shows an unavailable status instead of a loading status after a request fails", async () => {
    vi.mocked(api.getScanStatus).mockRejectedValueOnce(new Error("Could not load library status"));
    const wrapper = mountLibraryPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Could not load library status");
    expect(wrapper.text()).toContain("Library status unavailable");
    expect(wrapper.text()).not.toContain("Library status is loading…");
  });

  it("disables refresh while the library is already refreshing", async () => {
    vi.mocked(api.getScanStatus).mockResolvedValueOnce({
      completedAt: null,
      playlistCount: 0,
      error: null,
      videoCount: 0,
      startedAt: "2026-08-12T00:00:00.000Z",
      status: "scanning",
      warnings: [],
    });
    const wrapper = mountLibraryPage();
    await flushPromises();

    const refreshButton = wrapper.get('button[aria-busy="true"]');
    expect(refreshButton.attributes()).toHaveProperty("disabled");
    expect(refreshButton.text()).toContain("Refreshing…");

    await refreshButton.trigger("click");
    expect(api.rescanLibrary).not.toHaveBeenCalled();
  });
});
