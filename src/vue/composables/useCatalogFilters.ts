import { useQueryClient } from "@tanstack/vue-query";
import { computed, shallowRef, toRef, watch, type MaybeRefOrGetter } from "vue";

import type { CatalogDto } from "@/api.js";
import { catalogQueryOptions, type CatalogQueryClient } from "@/queries.js";
import { useCatalogData } from "./useCatalogData.js";
import { useCatalogRouteState } from "./useCatalogRouteState.js";

export function useCatalogFilters(
  client: Pick<CatalogQueryClient, "getCatalog">,
  debounceMilliseconds = 150,
  accumulatePages: MaybeRefOrGetter<boolean> = false,
) {
  const queryClient = useQueryClient();
  const accumulatePagesRef = toRef(accumulatePages);
  const routeState = useCatalogRouteState(debounceMilliseconds);
  const dataState = useCatalogData(routeState.filters, client, routeState.normalizePage);
  const loadedCourses = shallowRef<CatalogDto["courses"]>([]);
  const loadedPage = shallowRef(1);
  const loadedTotalPages = shallowRef(0);
  const loadingMore = shallowRef(false);
  const loadMoreError = shallowRef("");
  let catalogGeneration = 0;

  watch(
    [routeState.filters, dataState.catalog, accumulatePagesRef],
    async ([filters, catalog, shouldAccumulate]) => {
      const generation = ++catalogGeneration;
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
        if (generation !== catalogGeneration) return;

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
        if (generation !== catalogGeneration) return;
        loadMoreError.value =
          caught instanceof Error ? caught.message : "Could not load more courses";
      } finally {
        if (generation === catalogGeneration) loadingMore.value = false;
      }
    },
    { immediate: true },
  );

  const canLoadMore = computed(() => loadedPage.value < loadedTotalPages.value);

  function loadMore(): void {
    if (loadingMore.value || !canLoadMore.value) return;

    const nextPage = loadedPage.value + 1;
    loadingMore.value = true;
    loadMoreError.value = "";
    routeState.setPage(nextPage);
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
    loadedCourses,
    loadMore,
    loadMoreError,
    loadingMore,
  };
}
