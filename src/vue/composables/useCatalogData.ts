import { useQuery } from "@tanstack/vue-query";
import { computed, watch, type ComputedRef } from "vue";

import type { CatalogDto, CatalogFilters } from "@/api.js";
import { catalogQueryOptions, type CatalogQueryClient } from "@/queries.js";

function emptyCatalog(): CatalogDto {
  return {
    courses: [],
    categories: [],
    instructors: [],
    tags: [],
    continueWatching: [],
    pagination: { page: 1, pageSize: 24, totalCourses: 0, totalPages: 0 },
  };
}

export function useCatalogData(
  filters: ComputedRef<CatalogFilters>,
  client: Pick<CatalogQueryClient, "getCatalog">,
  normalizePage: (page: number) => void,
) {
  const catalogRequest = useQuery(computed(() => catalogQueryOptions(filters.value, client)));

  watch([catalogRequest.data, catalogRequest.isPlaceholderData], ([catalog, isPlaceholderData]) => {
    if (catalog && !isPlaceholderData) normalizePage(catalog.pagination.page);
  });

  const catalog = computed(() => catalogRequest.data.value ?? emptyCatalog());
  const loading = computed(() => catalogRequest.isPending.value);
  const refreshing = computed(
    () => catalogRequest.isFetching.value && !catalogRequest.isPending.value,
  );
  const error = computed(() => {
    const caught = catalogRequest.error.value;
    return caught instanceof Error ? caught.message : caught ? "Could not load your library" : "";
  });

  return {
    catalog,
    error,
    loading,
    refreshCatalog: catalogRequest.refetch,
    refreshing,
  };
}
