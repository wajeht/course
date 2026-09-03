// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, type LibraryDto } from "@/api.js";
import { queryKeys } from "@/queries.js";

import LibraryPage from "./LibraryPage.vue";

const playlistId = "1".repeat(24);
const videoId = "2".repeat(24);

function library(): LibraryDto {
  return {
    authors: [{ name: "Example", videoCount: 1 }],
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
    tags: [{ name: "Archive", videoCount: 1 }],
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
  return { queryClient, router, wrapper };
}

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.spyOn(api, "getLibrary");
    vi.spyOn(api, "getSettings").mockResolvedValue({ libraryPageSize: 24 });
    vi.spyOn(api, "updateSettings").mockImplementation(async (libraryPageSize) => ({
      libraryPageSize,
    }));
  });

  afterEach(() => vi.restoreAllMocks());

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

  it("prefetches hovered author and tag options with the other active filter", async () => {
    const getLibrary = vi.fn(async (filters) => ({
      ...library(),
      pagination: {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 24,
        totalPages: 3,
        totalVideos: 60,
      },
    }));
    const { router, wrapper } = await mountLibraryPage(
      "/videos?author=Current+Author&tag=Current+Tag&q=term&page=2",
      getLibrary,
    );
    getLibrary.mockClear();

    await wrapper
      .get('input[name="library-desktop-author"][value="Example"]')
      .element.closest("label")!
      .dispatchEvent(new PointerEvent("pointerenter"));

    await vi.waitFor(() =>
      expect(getLibrary).toHaveBeenCalledWith(
        {
          author: ["Current Author", "Example"],
          page: 2,
          query: "term",
          tag: ["Current Tag"],
        },
        expect.any(AbortSignal),
      ),
    );
    getLibrary.mockClear();
    await wrapper.get('input[name="library-desktop-author"][value="Example"]').setValue(true);
    await flushPromises();

    expect(getLibrary).not.toHaveBeenCalled();

    await wrapper
      .get('input[name="library-desktop-tag"][value="Archive"]')
      .element.closest("label")!
      .dispatchEvent(new PointerEvent("pointerenter"));

    await vi.waitFor(() =>
      expect(getLibrary).toHaveBeenCalledWith(
        {
          author: ["Current Author", "Example"],
          page: 2,
          query: "term",
          tag: ["Current Tag", "Archive"],
        },
        expect.any(AbortSignal),
      ),
    );
    expect(router.currentRoute.value.query).toEqual({
      author: ["Current Author", "Example"],
      page: "2",
      q: "term",
      tag: "Current Tag",
    });
  });

  it("prefetches view and page-size hovers with the current URL parameters", async () => {
    let finishPageSizeSave!: (settings: { libraryPageSize: 48 }) => void;
    vi.mocked(api.updateSettings).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishPageSizeSave = resolve;
        }),
    );
    const getLibrary = vi.fn(async (filters) => ({
      ...library(),
      pagination: {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 24,
        totalPages: 3,
        totalVideos: 60,
      },
    }));
    const { queryClient, router, wrapper } = await mountLibraryPage(
      "/videos?author=Current+Author&tag=Current+Tag&q=term&page=2",
      getLibrary,
    );

    await queryClient.invalidateQueries({ queryKey: queryKeys.library, refetchType: "none" });
    getLibrary.mockClear();
    await wrapper
      .get('input[name="library-desktop-view"][value="playlists"]')
      .element.closest("label")!
      .dispatchEvent(new PointerEvent("pointerenter"));

    await vi.waitFor(() =>
      expect(getLibrary).toHaveBeenCalledWith(
        {
          author: ["Current Author"],
          page: 2,
          query: "term",
          tag: ["Current Tag"],
        },
        expect.any(AbortSignal),
      ),
    );
    getLibrary.mockClear();
    await wrapper.get('input[name="library-desktop-view"][value="playlists"]').setValue();
    await flushPromises();

    expect(getLibrary).not.toHaveBeenCalled();
    expect(router.currentRoute.value.query).toEqual({
      author: "Current Author",
      page: "2",
      q: "term",
      tag: "Current Tag",
      view: "playlists",
    });

    getLibrary.mockClear();
    await wrapper
      .get('input[name="library-desktop-page-size"][value="48"]')
      .element.closest("label")!
      .dispatchEvent(new PointerEvent("pointerenter"));

    await vi.waitFor(() =>
      expect(getLibrary).toHaveBeenCalledWith(
        {
          author: ["Current Author"],
          page: 2,
          pageSize: 48,
          query: "term",
          tag: ["Current Tag"],
        },
        expect.any(AbortSignal),
      ),
    );
    getLibrary.mockClear();
    await wrapper.get('input[name="library-desktop-page-size"][value="48"]').setValue();
    await flushPromises();

    expect(getLibrary).not.toHaveBeenCalled();
    expect(router.currentRoute.value.query).toEqual({
      author: "Current Author",
      page: "2",
      q: "term",
      tag: "Current Tag",
      view: "playlists",
    });

    finishPageSizeSave({ libraryPageSize: 48 });
    await flushPromises();
  });

  it("starts loading the hovered view's covers before selection", async () => {
    const prefetchedImages: HTMLImageElement[] = [];
    const imageSource = vi
      .spyOn(HTMLImageElement.prototype, "src", "set")
      .mockImplementation(function (this: HTMLImageElement, source) {
        prefetchedImages.push(this);
        expect(source).toBe("/covers/prefetched-playlist.jpg");
      });
    const { wrapper } = await mountLibraryPage("/videos", async () => ({
      ...library(),
      playlists: [
        {
          ...library().playlists[0]!,
          coverUrl: "/covers/prefetched-playlist.jpg",
        },
      ],
    }));

    await wrapper
      .get('input[name="library-desktop-view"][value="playlists"]')
      .element.closest("label")!
      .dispatchEvent(new PointerEvent("pointerenter"));

    await vi.waitFor(() => expect(imageSource).toHaveBeenCalledOnce());
    expect(wrapper.text()).not.toContain("Saved Collection");
    const prefetchedImage = prefetchedImages[0];
    if (!prefetchedImage) throw new Error("Playlist cover was not prefetched");
    prefetchedImage.dispatchEvent(new Event("load"));
  });

  it("saves videos per page from the library filters and preserves the current page", async () => {
    const { router, wrapper } = await mountLibraryPage("/videos?page=2", async (filters) => ({
      ...library(),
      pagination: {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 24,
        totalPages: 2,
        totalVideos: 25,
      },
    }));

    await wrapper.get('input[name="library-desktop-page-size"][value="12"]').setValue();
    await flushPromises();

    expect(api.updateSettings).toHaveBeenCalledWith(12);
    expect(router.currentRoute.value.query).toEqual({ page: "2" });
    expect(wrapper.get("aside").text()).toContain("Videos per page");
  });
});
