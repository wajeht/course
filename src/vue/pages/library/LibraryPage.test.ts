// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";

import { api, type LibraryDto } from "@/api.js";

import LibraryPage from "./LibraryPage.vue";

vi.mock("@/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api.js")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getLibrary: vi.fn(),
      getSettings: vi.fn(async () => ({ libraryPageSize: 24 })),
      updateSettings: vi.fn(async (libraryPageSize) => ({ libraryPageSize })),
    },
  };
});

const playlistId = "1".repeat(24);
const videoId = "2".repeat(24);

function library(): LibraryDto {
  return {
    authors: [],
    continueWatching: [],
    pagination: { page: 1, pageSize: 24, totalPages: 1, totalVideos: 1 },
    playlists: [
      {
        authors: [],
        completedCount: 0,
        coverUrl: null,
        description: "",
        durationSeconds: 120,
        id: playlistId,
        nextVideoId: videoId,
        progressPercent: 0,
        source: null,
        tags: [],
        title: "Saved Collection",
        videoCount: 1,
      },
    ],
    tags: [],
    videos: [
      {
        authors: [],
        completed: false,
        coverUrl: null,
        description: "",
        durationSeconds: 120,
        id: videoId,
        playlistId: null,
        playlistSectionId: null,
        playlistSectionTitle: null,
        playlistTitle: null,
        positionSeconds: 0,
        progressPercent: 0,
        source: null,
        tags: [],
        title: "Standalone video",
      },
    ],
  };
}

async function mountLibraryPage(
  path = "/videos",
  getLibrary: typeof api.getLibrary = async () => library(),
) {
  vi.mocked(api.getLibrary).mockImplementation(getLibrary);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/videos", name: "videos", component: LibraryPage },
      { path: "/videos/:videoId", name: "player", component: { template: "<div />" } },
    ],
  });
  await router.push(path);
  await router.isReady();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = mount(LibraryPage, {
    global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
  });
  await flushPromises();
  return { router, wrapper };
}

describe("LibraryPage", () => {
  it("shows videos by default and only playlist cards in the playlists view", async () => {
    const { router, wrapper } = await mountLibraryPage();

    expect(wrapper.get("h1").text()).toBe("All videos");
    expect(wrapper.text()).toContain("Standalone video");
    expect(wrapper.text()).not.toContain("Saved Collection");
    expect(wrapper.get(`a[href="/videos/${videoId}"]`).attributes("aria-label")).toBe(
      "Play Standalone video",
    );

    await wrapper.get('input[value="playlists"]').setValue();
    await flushPromises();

    expect(router.currentRoute.value.query).toEqual({ view: "playlists" });
    expect(wrapper.get("h1").text()).toBe("Playlists");
    expect(wrapper.text()).toContain("Saved Collection");
    expect(wrapper.text()).not.toContain("Standalone video");
    expect(
      wrapper.get(`a[href="/videos/${videoId}?list=${playlistId}"]`).attributes("aria-label"),
    ).toBe("Open Saved Collection");
  });

  it("opens playlist videos with list context", async () => {
    const playlistVideoId = "3".repeat(24);
    const { wrapper } = await mountLibraryPage("/videos", async () => ({
      ...library(),
      videos: [
        {
          ...library().videos[0]!,
          id: playlistVideoId,
          playlistId,
          playlistTitle: "Saved Collection",
          title: "Playlist video",
        },
      ],
    }));

    expect(
      wrapper
        .get(`a[href="/videos/${playlistVideoId}?list=${playlistId}"]`)
        .attributes("aria-label"),
    ).toBe("Play Playlist video");
  });

  it("clears search, author, tag, view, and page together", async () => {
    const { router, wrapper } = await mountLibraryPage(
      "/videos?q=term&author=Example&tag=Archive&view=playlists&page=2",
    );

    await wrapper.get('[data-clear-filters="mobile"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.query).toEqual({});
  });

  it("prefetches the next video page on pagination hover", async () => {
    const getLibrary = vi.fn(async (filters) => ({
      ...library(),
      pagination: {
        page: filters?.page ?? 1,
        pageSize: 24,
        totalPages: 2,
        totalVideos: 25,
      },
    }));
    const { router, wrapper } = await mountLibraryPage(
      "/videos?q=term&author=Example&tag=Archive",
      getLibrary,
    );

    await wrapper.get('nav[aria-label="Pages"] button:last-of-type').trigger("pointerenter");

    await vi.waitFor(() =>
      expect(getLibrary).toHaveBeenCalledWith(
        { author: ["Example"], page: 2, query: "term", tag: ["Archive"] },
        expect.any(AbortSignal),
      ),
    );
    expect(router.currentRoute.value.query).toEqual({
      author: "Example",
      q: "term",
      tag: "Archive",
    });
  });

  it("saves videos per page from the library filters and returns to page 1", async () => {
    const { router, wrapper } = await mountLibraryPage("/videos?page=2");

    await wrapper.get('input[name="library-desktop-page-size"][value="12"]').setValue();
    await flushPromises();

    expect(api.updateSettings).toHaveBeenCalledWith(12);
    expect(router.currentRoute.value.query).toEqual({});
    expect(wrapper.get("aside").text()).toContain("Videos per page");
  });
});
