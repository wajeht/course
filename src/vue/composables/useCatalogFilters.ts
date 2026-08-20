import { computed } from "vue";

import type { CatalogQueryClient } from "@/queries.js";
import { useCatalogData } from "./useCatalogData.js";
import { useCatalogRouteState } from "./useCatalogRouteState.js";

export function useCatalogFilters(
  client: Pick<CatalogQueryClient, "getCatalog">,
  debounceMilliseconds = 150,
) {
  const routeState = useCatalogRouteState(debounceMilliseconds);
  const dataState = useCatalogData(routeState.filters, client, routeState.normalizePage);
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

  return { ...routeState, ...dataState, libraryTitle };
}
