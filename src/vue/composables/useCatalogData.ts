import { useQuery } from "@tanstack/vue-query";
import { computed, watch, type ComputedRef } from "vue";

import type { CatalogDto, CatalogFilters } from "@/api.js";
import { catalogQueryOptions, scanStatusQueryOptions, type CatalogQueryClient } from "@/queries.js";

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
  client: CatalogQueryClient,
  normalizePage: (page: number) => void,
) {
  const catalogRequest = useQuery(computed(() => catalogQueryOptions(filters.value, client)));
  const scanStatusRequest = useQuery(scanStatusQueryOptions(client));

  watch(catalogRequest.data, (catalog) => {
    if (catalog) normalizePage(catalog.pagination.page);
  });

  const catalog = computed(() => catalogRequest.data.value ?? emptyCatalog());
  const scanStatus = computed(() => scanStatusRequest.data.value);
  const loading = computed(() => catalogRequest.isPending.value);
  const refreshing = computed(
    () => catalogRequest.isFetching.value && !catalogRequest.isPending.value,
  );
  const error = computed(() => {
    const caught = catalogRequest.error.value ?? scanStatusRequest.error.value;
    return caught instanceof Error ? caught.message : caught ? "Could not load your library" : "";
  });

  return {
    catalog,
    error,
    loading,
    refreshCatalog: catalogRequest.refetch,
    refreshing,
    scanStatus,
  };
}
