import { useQueryClient } from "@tanstack/vue-query";
import { computed, shallowRef, watch } from "vue";

import type { CatalogDto } from "@/api.js";
import { catalogQueryOptions, type CatalogQueryClient } from "@/queries.js";
import { useCatalogData } from "./useCatalogData.js";
import { useCatalogRouteState } from "./useCatalogRouteState.js";

export function useCatalogFilters(
  client: Pick<CatalogQueryClient, "getCatalog">,
  debounceMilliseconds = 150,
) {
  const queryClient = useQueryClient();
  const routeState = useCatalogRouteState(debounceMilliseconds);
  const dataState = useCatalogData(routeState.filters, client, routeState.normalizePage);
  const loadedCourses = shallowRef<CatalogDto["courses"]>([]);
  const loadedPage = shallowRef(1);
  const loadedTotalPages = shallowRef(0);
  const loadingMore = shallowRef(false);
  const loadMoreError = shallowRef("");
  let catalogGeneration = 0;

  watch(
    [routeState.filters, dataState.catalog],
    ([, catalog]) => {
      catalogGeneration += 1;
      loadedCourses.value = catalog.courses;
      loadedPage.value = catalog.pagination.page;
      loadedTotalPages.value = catalog.pagination.totalPages;
      loadingMore.value = false;
      loadMoreError.value = "";
    },
    { immediate: true },
  );

  const canLoadMore = computed(() => loadedPage.value < loadedTotalPages.value);

  async function loadMore(): Promise<void> {
    if (loadingMore.value || !canLoadMore.value) return;

    const generation = catalogGeneration;
    const nextPage = loadedPage.value + 1;
    loadingMore.value = true;
    loadMoreError.value = "";

    try {
      const nextCatalog = await queryClient.fetchQuery(
        catalogQueryOptions({ ...routeState.filters.value, page: nextPage }, client),
      );
      if (generation !== catalogGeneration) return;

      const loadedIds = new Set(loadedCourses.value.map((course) => course.id));
      loadedCourses.value = [
        ...loadedCourses.value,
        ...nextCatalog.courses.filter((course) => !loadedIds.has(course.id)),
      ];
      loadedPage.value = nextCatalog.pagination.page;
      loadedTotalPages.value = nextCatalog.pagination.totalPages;
    } catch (caught) {
      if (generation !== catalogGeneration) return;
      loadMoreError.value =
        caught instanceof Error ? caught.message : "Could not load more courses";
    } finally {
      if (generation === catalogGeneration) loadingMore.value = false;
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
    loadedCourses,
    loadMore,
    loadMoreError,
    loadingMore,
  };
}
