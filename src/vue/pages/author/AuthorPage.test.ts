// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";

import { api, type LibraryDto } from "@/api.js";

import AuthorPage from "./AuthorPage.vue";

vi.mock("@/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api.js")>();
  return {
    ...actual,
    api: { ...actual.api, getLibrary: vi.fn() },
  };
});

const playlistId = "1".repeat(24);
const videoId = "2".repeat(24);

function authorLibrary(): LibraryDto {
  return {
    authors: [{ name: "Jane Smith", videoCount: 1 }],
    continueWatching: [],
    pagination: { page: 1, pageSize: 24, totalPages: 1, totalVideos: 1 },
    playlists: [
      {
        authors: ["Jane Smith"],
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
        authors: ["Jane Smith"],
        completed: false,
        coverUrl: null,
        description: "",
        durationSeconds: 120,
        id: videoId,
        playlistId,
        playlistSectionId: null,
        playlistSectionTitle: null,
        playlistTitle: "Saved Collection",
        positionSeconds: 0,
        progressPercent: 0,
        source: null,
        tags: [],
        title: "Example video",
      },
    ],
  };
}

async function mountAuthorPage(getLibrary: typeof api.getLibrary = async () => authorLibrary()) {
  vi.mocked(api.getLibrary).mockImplementation(getLibrary);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/authors/:authorName", name: "author", component: AuthorPage },
      { path: "/playlists/:playlistId", name: "playlist", component: { template: "<div />" } },
      { path: "/videos/:videoId", name: "player", component: { template: "<div />" } },
      { path: "/:pathMatch(.*)*", name: "not-found", component: { template: "<div />" } },
    ],
  });
  await router.push("/authors/Jane%20Smith");
  await router.isReady();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = mount(AuthorPage, {
    global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
  });
  await flushPromises();
  return { router, wrapper };
}

describe("AuthorPage", () => {
  it("shows an author's playlists and videos", async () => {
    const { wrapper } = await mountAuthorPage();

    expect(api.getLibrary).toHaveBeenCalledWith(
      { author: ["Jane Smith"], page: 1 },
      expect.any(AbortSignal),
    );
    expect(wrapper.get("h1").text()).toBe("Jane Smith");
    expect(wrapper.text()).toContain("Saved Collection");
    expect(wrapper.text()).toContain("Example video");
  });

  it("loads the next author when the route parameter changes", async () => {
    const guestLibrary: LibraryDto = {
      ...authorLibrary(),
      authors: [
        { name: "Guest", videoCount: 1 },
        { name: "Jane Smith", videoCount: 1 },
      ],
      playlists: [],
      videos: [{ ...authorLibrary().videos[0]!, authors: ["Guest"], title: "Guest video" }],
    };
    const { router, wrapper } = await mountAuthorPage(async (filters) =>
      filters?.author?.[0] === "Guest" ? guestLibrary : authorLibrary(),
    );

    await router.push("/authors/Guest");
    await flushPromises();

    expect(api.getLibrary).toHaveBeenLastCalledWith(
      { author: ["Guest"], page: 1 },
      expect.any(AbortSignal),
    );
    expect(wrapper.get("h1").text()).toBe("Guest");
    expect(wrapper.text()).toContain("Guest video");
    expect(wrapper.text()).not.toContain("Example video");
  });
});
