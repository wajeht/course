import { computed } from "vue";

import type { CatalogClient } from "./useCatalogQuery.js";
import { useCatalogQuery } from "./useCatalogQuery.js";
import { useCatalogRouteState } from "./useCatalogRouteState.js";

export function useCatalogFilters(client: CatalogClient, debounceMilliseconds = 150) {
  const routeState = useCatalogRouteState(debounceMilliseconds);
  const queryState = useCatalogQuery(routeState.filters, client, routeState.normalizePage);
  const libraryTitle = computed(() => {
    const count = queryState.catalog.value.pagination.totalCourses;
    const courseLabel = count === 1 ? "course" : "courses";
    if (routeState.searchQuery.value) return `${count} matching ${courseLabel}`;
    if (routeState.selectedFilters.value.length === 1) {
      return `${routeState.selectedFilters.value[0]} courses`;
    }
    if (routeState.selectedFilters.value.length > 1) return `${count} filtered ${courseLabel}`;
    return "All courses";
  });

  return { ...routeState, ...queryState, libraryTitle };
}
