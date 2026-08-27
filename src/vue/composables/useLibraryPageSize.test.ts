// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createApp, effectScope } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, type LibraryDto } from "@/api.js";
import { useLibraryPageSize } from "@/composables/useLibraryPageSize.js";
import { libraryQueryOptions, queryKeys } from "@/queries.js";

function library(): LibraryDto {
  return {
    authors: [],
    continueWatching: [],
    pagination: { page: 1, pageSize: 24, totalPages: 2, totalVideos: 25 },
    playlists: [],
    tags: [],
    videos: [],
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
  const pageSize = app.runWithContext(() => scope.run(() => useLibraryPageSize()));
  if (!pageSize) throw new Error("Library page size did not initialize");
  return {
    pageSize,
    queryClient,
    router,
    stop: () => {
      scope.stop();
      queryClient.clear();
    },
  };
}

beforeEach(() => {
  vi.spyOn(api, "getLibrary").mockImplementation(async () => library());
  vi.spyOn(api, "getSettings").mockResolvedValue({ libraryPageSize: 24 });
  vi.spyOn(api, "updateSettings").mockImplementation(async (libraryPageSize) => ({
    libraryPageSize,
  }));
});

afterEach(() => vi.restoreAllMocks());

describe("useLibraryPageSize", () => {
  it("saves on change, preserves the current URL, and refreshes the library", async () => {
    const { pageSize, queryClient, router, stop } = await setup("/videos?page=2&q=term");
    await vi.waitFor(() => expect(pageSize.disabled.value).toBe(false));
    await queryClient.fetchQuery(libraryQueryOptions({ page: 2 }, api));

    await pageSize.setLibraryPageSize(48);

    expect(api.updateSettings).toHaveBeenCalledWith(48);
    expect(router.currentRoute.value.query).toEqual({ page: "2", q: "term" });
    expect(queryClient.getQueryState(queryKeys.libraryList({ page: 2 }))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData(queryKeys.settings)).toEqual({ libraryPageSize: 48 });
    expect(pageSize.libraryPageSize.value).toBe(48);
    expect(pageSize.pageSizeOverride.value).toBe(48);
    stop();
  });

  it("keeps the current size and skips saving when settings cannot be loaded", async () => {
    vi.mocked(api.getSettings).mockRejectedValueOnce(new Error("Could not load settings"));
    const { pageSize, stop } = await setup();

    await vi.waitFor(() => expect(pageSize.error.value).toBe("Could not load settings"));
    expect(pageSize.disabled.value).toBe(true);
    await pageSize.setLibraryPageSize(48);
    expect(api.updateSettings).not.toHaveBeenCalled();
    expect(pageSize.libraryPageSize.value).toBe(24);
    stop();
  });

  it("reverts the selected size when saving fails", async () => {
    vi.mocked(api.updateSettings).mockRejectedValueOnce(new Error("Could not save"));
    const { pageSize, stop } = await setup();
    await vi.waitFor(() => expect(pageSize.disabled.value).toBe(false));

    await pageSize.setLibraryPageSize(48);
    expect(pageSize.error.value).toBe("Could not save library settings");
    expect(pageSize.libraryPageSize.value).toBe(24);
    expect(pageSize.pageSizeOverride.value).toBeUndefined();
    stop();
  });
});
