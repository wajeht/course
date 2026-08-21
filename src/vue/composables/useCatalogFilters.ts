import { useQueryClient } from "@tanstack/vue-query";
import { computed, readonly, shallowRef, toRef, watch, type MaybeRefOrGetter } from "vue";

import type { CatalogDto } from "@/api.js";
import { catalogQueryOptions, type CatalogQueryClient } from "@/queries.js";
import { useCatalogData } from "./useCatalogData.js";
import { useCatalogRouteState } from "./useCatalogRouteState.js";

interface UseCatalogFiltersOptions {
  accumulatePages?: MaybeRefOrGetter<boolean>;
  debounceMilliseconds?: number;
}

export function useCatalogFilters(
  client: Pick<CatalogQueryClient, "getCatalog">,
  options: UseCatalogFiltersOptions = {},
) {
  const { accumulatePages = false, debounceMilliseconds = 150 } = options;
  const queryClient = useQueryClient();
  const accumulatePagesRef = toRef(accumulatePages);
  const routeState = useCatalogRouteState(debounceMilliseconds);
  const dataState = useCatalogData(routeState.filters, client, routeState.normalizePage);
  const loadedCourses = shallowRef<CatalogDto["courses"]>([]);
  const loadedPage = shallowRef(1);
  const loadedTotalPages = shallowRef(0);
  const loadingMore = shallowRef(false);
  const loadMoreError = shallowRef("");

  watch(
    [routeState.filters, dataState.catalog, accumulatePagesRef],
    async ([filters, catalog, shouldAccumulate], _previous, onCleanup) => {
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      const requestedPage = filters.page ?? 1;
      if (catalog.pagination.page !== requestedPage) return;

      loadedTotalPages.value = catalog.pagination.totalPages;
      loadMoreError.value = "";

      if (!shouldAccumulate) {
        loadedCourses.value = catalog.courses;
        loadedPage.value = catalog.pagination.page;
        loadingMore.value = false;
        return;
      }

      try {
        const catalogs = await Promise.all(
          Array.from({ length: requestedPage }, (_, index) =>
            queryClient.fetchQuery(catalogQueryOptions({ ...filters, page: index + 1 }, client)),
          ),
        );
        if (cancelled) return;

        const loadedIds = new Set<string>();
        loadedCourses.value = catalogs.flatMap((pageCatalog) =>
          pageCatalog.courses.filter((course) => {
            if (loadedIds.has(course.id)) return false;
            loadedIds.add(course.id);
            return true;
          }),
        );
        loadedPage.value = catalog.pagination.page;
      } catch (caught) {
        if (cancelled) return;
        loadMoreError.value =
          caught instanceof Error ? caught.message : "Could not load more courses";
      } finally {
        if (!cancelled) loadingMore.value = false;
      }
    },
    { immediate: true },
  );

  const canLoadMore = computed(() => loadedPage.value < loadedTotalPages.value);

  async function loadMore(): Promise<void> {
    if (loadingMore.value || !canLoadMore.value) return;

    const nextPage = loadedPage.value + 1;
    loadingMore.value = true;
    loadMoreError.value = "";

    try {
      await routeState.setPage(nextPage);
      await queryClient.fetchQuery(
        catalogQueryOptions({ ...routeState.filters.value, page: nextPage }, client),
      );
    } catch (caught) {
      loadMoreError.value =
        caught instanceof Error ? caught.message : "Could not load more courses";
      loadingMore.value = false;
    }
  }

  const libraryTitle = computed(() => {
    const count = dataState.catalog.value.pagination.totalCourses;
    const courseLabel = count === 1 ? "course" : "courses";
    if (routeState.searchQuery.value) return `${count} matching ${courseLabel}`;
    if (routeState.selectedFilters.value.length === 1) {
      return `${routeState.selectedFilters.value[0]} courses`;
    }
    if (routeState.selectedFilters.value.length > 1) return `${count} filtered ${courseLabel}`;
    return "All courses";
  });

  return {
    ...routeState,
    ...dataState,
    canLoadMore,
    libraryTitle,
    loadedCourses: readonly(loadedCourses),
    loadMore,
    loadMoreError: readonly(loadMoreError),
    loadingMore: readonly(loadingMore),
  };
}
