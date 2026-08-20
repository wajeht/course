import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createApp, effectScope } from "vue";
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
    scope.run(() => useCatalogFilters(client, debounceMilliseconds)),
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
      "/?q=guard&category=Martial+Arts&category=Technology&instructor=John+Danaher&tag=BJJ&page=2",
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
