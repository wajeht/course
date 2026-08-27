// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createApp, effectScope, isReadonly } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, type LibraryDto, type LibraryFilters } from "@/api.js";
import { useLibraryBrowser } from "@/composables/useLibraryBrowser.js";

function library(title: string, page: number): LibraryDto {
  const id = String(page).repeat(24);
  return {
    authors: [],
    continueWatching: [],
    pagination: { page, pageSize: 1, totalPages: 2, totalVideos: 2 },
    playlists: [],
    tags: [],
    videos: [
      {
        authors: [],
        completed: false,
        coverUrl: null,
        description: "",
        durationSeconds: 60,
        id,
        playlistId: null,
        playlistSectionId: null,
        playlistSectionTitle: null,
        playlistTitle: null,
        positionSeconds: 0,
        progressPercent: 0,
        source: null,
        tags: [],
        title,
      },
    ],
  };
}

async function setup(path = "/videos") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/videos", component: { template: "<div />" } }],
  });
  await router.push(path);
  await router.isReady();
  const app = createApp({});
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  app.use(VueQueryPlugin, { queryClient });
  app.use(router);
  const scope = effectScope();
  const browser = app.runWithContext(() =>
    scope.run(() => useLibraryBrowser({ accumulatePages: true, debounceMilliseconds: 0 })),
  );
  if (!browser) throw new Error("Library browser did not initialize");
  return {
    browser,
    router,
    stop: () => {
      scope.stop();
      queryClient.clear();
    },
  };
}

beforeEach(() => vi.spyOn(api, "getLibrary"));
afterEach(() => vi.restoreAllMocks());

describe("useLibraryBrowser", () => {
  it("appends videos and stores the loaded page in the URL", async () => {
    vi.mocked(api.getLibrary).mockImplementation(async (filters?: LibraryFilters) =>
      filters?.page === 2 ? library("Second video", 2) : library("First video", 1),
    );
    const { browser, router, stop } = await setup();
    await vi.waitFor(() => expect(browser.loadedVideos.value).toHaveLength(1));

    await browser.loadMore();

    await vi.waitFor(() => expect(browser.loadedVideos.value).toHaveLength(2));
    expect(router.currentRoute.value.query.page).toBe("2");
    expect(browser.loadedVideos.value.map((video) => video.title)).toEqual([
      "First video",
      "Second video",
    ]);
    expect(browser.canLoadMore.value).toBe(false);
    expect(isReadonly(browser.loadedVideos)).toBe(true);
    stop();
  });

  it("retries an earlier failed page without changing a deep-link URL", async () => {
    let pageOneAttempts = 0;
    vi.mocked(api.getLibrary).mockImplementation(async (filters?: LibraryFilters) => {
      if (filters?.page === 2) return library("Second video", 2);
      pageOneAttempts += 1;
      if (pageOneAttempts === 1) throw new Error("Page one failed");
      return library("First video", 1);
    });
    const { browser, router, stop } = await setup("/videos?page=2");
    await vi.waitFor(() => expect(browser.loadMoreError.value).toBe("Could not load more videos"));

    await browser.loadMore();

    await vi.waitFor(() => expect(browser.loadedVideos.value).toHaveLength(2));
    expect(router.currentRoute.value.query.page).toBe("2");
    expect(browser.loadedVideos.value.map((video) => video.title)).toEqual([
      "First video",
      "Second video",
    ]);
    expect(browser.loadMoreError.value).toBe("");
    expect(pageOneAttempts).toBe(2);
    stop();
  });
});
