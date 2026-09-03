// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, type LibraryDto } from "@/api.js";

import AuthorPage from "./AuthorPage.vue";

const playlistId = "1".repeat(24);
const videoId = "2".repeat(24);

beforeEach(() => vi.spyOn(api, "getLibrary"));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function useMobileViewport(): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query === "(max-width: 600px)",
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
    })),
  );
}

function authorLibrary(): LibraryDto {
  return {
    authors: [{ count: 1, name: "Jane Smith" }],
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

async function mountAuthorPage(
  getLibrary: typeof api.getLibrary = async () => authorLibrary(),
  initialPath = "/authors/Jane%20Smith",
) {
  vi.mocked(api.getLibrary).mockImplementation(getLibrary);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/authors/:authorName", name: "author", component: AuthorPage },
      { path: "/videos/:videoId", name: "player", component: { template: "<div />" } },
      { path: "/:pathMatch(.*)*", name: "not-found", component: { template: "<div />" } },
    ],
  });
  await router.push(initialPath);
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
    expect(wrapper.get('a[aria-label="Play Example video"]').attributes("href")).toBe(
      `/videos/${videoId}?list=${playlistId}`,
    );
  });

  it("loads the next author when the route parameter changes", async () => {
    const guestLibrary: LibraryDto = {
      ...authorLibrary(),
      authors: [
        { count: 1, name: "Guest" },
        { count: 1, name: "Jane Smith" },
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

  it("prefetches the next author page on pagination hover", async () => {
    const getLibrary = vi.fn(async (filters) => ({
      ...authorLibrary(),
      pagination: {
        page: filters?.page ?? 1,
        pageSize: 24,
        totalPages: 2,
        totalVideos: 25,
      },
    }));
    const { router, wrapper } = await mountAuthorPage(getLibrary);

    await wrapper.get('nav[aria-label="Pages"] button:last-of-type').trigger("pointerenter");

    await vi.waitFor(() =>
      expect(getLibrary).toHaveBeenCalledWith(
        { author: ["Jane Smith"], page: 2 },
        expect.any(AbortSignal),
      ),
    );
    expect(router.currentRoute.value.query).toEqual({});
  });

  it("loads more author videos on mobile and keeps the page in the URL", async () => {
    useMobileViewport();
    const getLibrary = vi.fn(async (filters) => {
      const requestedPage = filters?.page ?? 1;
      return {
        ...authorLibrary(),
        pagination: {
          page: requestedPage,
          pageSize: 1,
          totalPages: 2,
          totalVideos: 2,
        },
        videos: [
          {
            ...authorLibrary().videos[0]!,
            id: String(requestedPage + 2).repeat(24),
            title: requestedPage === 2 ? "Second author video" : "First author video",
          },
        ],
      };
    });
    const { router, wrapper } = await mountAuthorPage(getLibrary);

    expect(wrapper.text()).toContain("First author video");
    expect(wrapper.text()).toContain("Saved Collection");
    const loadMore = wrapper.get('[data-testid="load-more-author-videos"]');
    await loadMore.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("First author video");
    expect(wrapper.text()).toContain("Second author video");
    expect(wrapper.text()).toContain("Saved Collection");
    expect(wrapper.find('[data-testid="load-more-author-videos"]').exists()).toBe(false);
    expect(router.currentRoute.value.query).toEqual({ page: "2" });
  });

  it("does not show a stale load-more error after navigating to another author", async () => {
    useMobileViewport();
    let rejectJanePage!: (cause?: unknown) => void;
    const pendingJanePage = new Promise<LibraryDto>((_resolve, reject) => {
      rejectJanePage = reject;
    });
    const guestLibrary: LibraryDto = {
      ...authorLibrary(),
      authors: [{ count: 1, name: "Guest" }],
      playlists: [],
      videos: [{ ...authorLibrary().videos[0]!, authors: ["Guest"], title: "Guest video" }],
    };
    const getLibrary = vi.fn(async (filters) => {
      if (filters?.author?.[0] === "Guest") return guestLibrary;
      if (filters?.page === 2) return pendingJanePage;
      return {
        ...authorLibrary(),
        pagination: { page: 1, pageSize: 1, totalPages: 2, totalVideos: 2 },
      };
    });
    const { router, wrapper } = await mountAuthorPage(getLibrary);

    await wrapper.get('[data-testid="load-more-author-videos"]').trigger("click");
    await vi.waitFor(() =>
      expect(getLibrary).toHaveBeenCalledWith(
        { author: ["Jane Smith"], page: 2 },
        expect.any(AbortSignal),
      ),
    );
    await router.push("/authors/Guest");
    await flushPromises();
    rejectJanePage(new Error("Jane page failed"));
    await flushPromises();

    expect(wrapper.get("h1").text()).toBe("Guest");
    expect(wrapper.text()).toContain("Guest video");
    expect(wrapper.text()).not.toContain("Could not load more videos");
  });

  it("keeps a mobile page deep link loading while earlier pages accumulate", async () => {
    useMobileViewport();
    let resolveFirstPage!: (library: LibraryDto) => void;
    const pendingFirstPage = new Promise<LibraryDto>((resolve) => {
      resolveFirstPage = resolve;
    });
    const getLibrary = vi.fn(async (filters) => {
      const requestedPage = filters?.page ?? 1;
      if (requestedPage === 1) return pendingFirstPage;
      return {
        ...authorLibrary(),
        pagination: { page: 2, pageSize: 1, totalPages: 2, totalVideos: 2 },
        videos: [
          {
            ...authorLibrary().videos[0]!,
            id: "4".repeat(24),
            title: "Second author video",
          },
        ],
      };
    });
    const { wrapper } = await mountAuthorPage(getLibrary, "/authors/Jane%20Smith?page=2");

    expect(wrapper.text()).not.toContain("No videos found");
    expect(wrapper.get('[aria-label="Loading videos"]').attributes("role")).toBe("status");

    resolveFirstPage({
      ...authorLibrary(),
      pagination: { page: 1, pageSize: 1, totalPages: 2, totalVideos: 2 },
      videos: [{ ...authorLibrary().videos[0]!, title: "First author video" }],
    });
    await flushPromises();

    expect(wrapper.text()).toContain("First author video");
    expect(wrapper.text()).toContain("Second author video");
    expect(wrapper.text()).not.toContain("No videos found");
  });
});
