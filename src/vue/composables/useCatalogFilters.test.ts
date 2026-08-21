import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createApp, effectScope, isReadonly } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";

import type { CatalogDto, CatalogFilters } from "@/api.js";
import { useCatalogFilters } from "./useCatalogFilters.js";

function catalog(title = "Course", page = 1): CatalogDto {
  return {
    courses: [
      {
        id: title,
        title,
        description: "",
        coverUrl: null,
        category: "Technology",
        instructors: ["Instructor"],
        tags: [],
        lessonCount: 1,
        durationSeconds: 60,
        completedCount: 0,
        progressPercent: 0,
      },
    ],
    categories: [],
    instructors: [],
    tags: [],
    continueWatching: [],
    pagination: { page, pageSize: 24, totalCourses: 30, totalPages: 2 },
  };
}

async function setup(
  client: {
    getCatalog(filters?: CatalogFilters, signal?: AbortSignal): Promise<CatalogDto>;
  },
  path = "/",
  debounceMilliseconds = 0,
  accumulatePages = false,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { template: "<div />" } }],
  });
  await router.push(path);
  const app = createApp({});
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  app.use(VueQueryPlugin, { queryClient });
  app.use(router);
  const scope = effectScope();
  const filters = app.runWithContext(() =>
    scope.run(() => useCatalogFilters(client, { accumulatePages, debounceMilliseconds })),
  );
  if (!filters) throw new Error("Composable did not initialize");
  return {
    filters,
    router,
    stop: () => {
      scope.stop();
      queryClient.clear();
    },
  };
}

describe("useCatalogFilters", () => {
  it("loads catalog state from a shareable URL", async () => {
    const client = {
      getCatalog: vi.fn(async () => catalog()),
    };
    const { filters, stop } = await setup(
      client,
      "/?q=guard&category=Technology&category=Martial+Arts&category=Technology&instructor=John+Danaher&tag=BJJ&page=2",
    );

    await vi.waitFor(() => expect(filters.catalog.value.courses[0]?.title).toBe("Course"));
    expect(client.getCatalog).toHaveBeenCalledWith(
      {
        query: "guard",
        category: ["Martial Arts", "Technology"],
        instructor: ["John Danaher"],
        tag: ["BJJ"],
        page: 2,
        pageSize: undefined,
      },
      expect.any(AbortSignal),
    );
    stop();
  });

  it("uses a natural heading for a single instructor filter", async () => {
    const client = {
      getCatalog: vi.fn(async () => catalog()),
    };
    const { filters, stop } = await setup(client, "/?instructor=John+Danaher");

    await vi.waitFor(() => expect(filters.libraryTitle.value).toBe("Courses by John Danaher"));
    stop();
  });

  it("debounces search into the URL", async () => {
    const client = {
      getCatalog: vi.fn(async () => catalog()),
    };
    const { filters, router, stop } = await setup(client, "/?page=2", 10);
    filters.query.value = "guard";

    expect(router.currentRoute.value.query.q).toBeUndefined();
    await vi.waitFor(() => expect(router.currentRoute.value.query.q).toBe("guard"));
    expect(router.currentRoute.value.query.page).toBeUndefined();
    stop();
  });

  it("clears search and facet filters with one route update", async () => {
    const client = {
      getCatalog: vi.fn(async (filters?: CatalogFilters) => catalog("Course", filters?.page)),
    };
    const { filters, router, stop } = await setup(
      client,
      "/?q=guard&category=Technology&instructor=Instructor&tag=Tag&page=2&pageSize=48",
      10,
    );

    filters.clearFilters();

    await vi.waitFor(() => expect(router.currentRoute.value.query).toEqual({ pageSize: "48" }));
    expect(filters.query.value).toBe("");
    expect(filters.hasActiveFilters.value).toBe(false);
    stop();
  });

  it("does not rewrite pagination when search state comes from navigation", async () => {
    const client = {
      getCatalog: vi.fn(async () => catalog()),
    };
    const { filters, router, stop } = await setup(client);

    await router.push({ query: { q: "guard", page: "2" } });
    await vi.waitFor(() => expect(filters.query.value).toBe("guard"));

    expect(router.currentRoute.value.query).toEqual({ q: "guard", page: "2" });
    stop();
  });

  it("keeps the previous results visible while a new search loads", async () => {
    let resolveSearch: ((value: CatalogDto) => void) | undefined;
    const searchResult = new Promise<CatalogDto>((resolve) => {
      resolveSearch = resolve;
    });
    const client = {
      getCatalog: vi
        .fn()
        .mockResolvedValueOnce(catalog("Old result"))
        .mockReturnValueOnce(searchResult),
    };
    const { filters, stop } = await setup(client);
    await vi.waitFor(() => expect(filters.catalog.value.courses[0]?.title).toBe("Old result"));

    filters.query.value = "new";
    await vi.waitFor(() => expect(client.getCatalog).toHaveBeenCalledTimes(2));
    expect(filters.catalog.value.courses[0]?.title).toBe("Old result");
    expect(filters.loading.value).toBe(false);
    expect(filters.refreshing.value).toBe(true);

    resolveSearch?.(catalog("New result"));
    await vi.waitFor(() => expect(filters.catalog.value.courses[0]?.title).toBe("New result"));
    stop();
  });

  it("stores pagination changes in the URL", async () => {
    const client = {
      getCatalog: vi.fn(async (filters?: CatalogFilters) => catalog("Course", filters?.page)),
    };
    const { filters, router, stop } = await setup(client);
    await vi.waitFor(() => expect(filters.catalog.value.pagination.totalPages).toBe(2));

    filters.setPage(2);
    await vi.waitFor(() => expect(router.currentRoute.value.query.page).toBe("2"));
    stop();
  });

  it("appends through the URL page when accumulation is enabled", async () => {
    const client = {
      getCatalog: vi.fn(async (filters?: CatalogFilters) =>
        filters?.page === 2 ? catalog("Second course", 2) : catalog("First course", 1),
      ),
    };
    const { filters, router, stop } = await setup(client, "/", 0, true);
    await vi.waitFor(() => expect(filters.loadedCourses.value[0]?.title).toBe("First course"));

    await filters.loadMore();

    await vi.waitFor(() => expect(router.currentRoute.value.query.page).toBe("2"));
    await vi.waitFor(() => expect(filters.loadedCourses.value).toHaveLength(2));
    expect(filters.loadedCourses.value.map((course) => course.title)).toEqual([
      "First course",
      "Second course",
    ]);
    expect(filters.canLoadMore.value).toBe(false);
    expect(client.getCatalog).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.any(AbortSignal),
    );
    stop();
  });

  it("recovers when loading the next page fails", async () => {
    let pageTwoAttempts = 0;
    const client = {
      getCatalog: vi.fn(async (filters?: CatalogFilters) => {
        if (filters?.page !== 2) return catalog("First course", 1);
        pageTwoAttempts += 1;
        if (pageTwoAttempts === 1) throw new Error("Page failed");
        return catalog("Second course", 2);
      }),
    };
    const { filters, router, stop } = await setup(client, "/", 0, true);
    await vi.waitFor(() => expect(filters.loadedCourses.value).toHaveLength(1));

    await filters.loadMore();

    await vi.waitFor(() => expect(router.currentRoute.value.query.page).toBe("2"));
    expect(filters.loadingMore.value).toBe(false);
    expect(filters.loadMoreError.value).toBe("Page failed");
    expect(filters.loadedCourses.value.map((course) => course.title)).toEqual(["First course"]);

    await filters.loadMore();

    await vi.waitFor(() => expect(filters.loadedCourses.value).toHaveLength(2), { timeout: 2_000 });
    expect(filters.loadingMore.value).toBe(false);
    expect(filters.loadMoreError.value).toBe("");
    expect(pageTwoAttempts).toBe(2);
    expect(isReadonly(filters.loadedCourses)).toBe(true);
    expect(isReadonly(filters.loadingMore)).toBe(true);
    expect(isReadonly(filters.loadMoreError)).toBe(true);
    stop();
  });

  it("retries an earlier failed page without changing a deep-link URL", async () => {
    let pageOneAttempts = 0;
    const client = {
      getCatalog: vi.fn(async (filters?: CatalogFilters) => {
        if (filters?.page === 2) return catalog("Second course", 2);
        pageOneAttempts += 1;
        if (pageOneAttempts === 1) throw new Error("Page one failed");
        return catalog("First course", 1);
      }),
    };
    const { filters, router, stop } = await setup(client, "/?page=2", 0, true);
    await vi.waitFor(() => expect(filters.loadMoreError.value).toBe("Page one failed"));

    await filters.loadMore();

    await vi.waitFor(() => expect(filters.loadedCourses.value).toHaveLength(2));
    expect(router.currentRoute.value.query.page).toBe("2");
    expect(filters.loadedCourses.value.map((course) => course.title)).toEqual([
      "First course",
      "Second course",
    ]);
    expect(filters.loadingMore.value).toBe(false);
    expect(filters.loadMoreError.value).toBe("");
    expect(pageOneAttempts).toBe(2);
    stop();
  });

  it("uses a page size from the URL when provided", async () => {
    const client = {
      getCatalog: vi.fn(async () => catalog()),
    };
    const { stop } = await setup(client, "/?pageSize=48");

    await vi.waitFor(() =>
      expect(client.getCatalog).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 48 }),
        expect.any(AbortSignal),
      ),
    );
    stop();
  });

  it("normalizes a page beyond the available results", async () => {
    const client = {
      getCatalog: vi.fn(async () => catalog("Course", 2)),
    };
    const { router, stop } = await setup(client, "/?page=99");

    await vi.waitFor(() => expect(router.currentRoute.value.query.page).toBe("2"));
    stop();
  });
});
