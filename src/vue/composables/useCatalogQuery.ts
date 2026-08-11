import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { computed, watch, type ComputedRef } from "vue";

import type { CatalogDto, CatalogFilters, ScanStatus } from "../api.js";
import { catalogKeys, scanKeys } from "../queries/queryKeys.js";

export interface CatalogClient {
  getCatalog(filters?: CatalogFilters, signal?: AbortSignal): Promise<CatalogDto>;
  getScanStatus(): Promise<ScanStatus>;
}

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

export function useCatalogQuery(
  filters: ComputedRef<CatalogFilters>,
  client: CatalogClient,
  normalizePage: (page: number) => void,
) {
  const catalogQuery = useQuery({
    queryKey: computed(() => catalogKeys.list(filters.value)),
    queryFn: ({ queryKey, signal }) => client.getCatalog(queryKey[2], signal),
    placeholderData: keepPreviousData,
  });
  const scanStatusQuery = useQuery({
    queryKey: scanKeys.all,
    queryFn: () => client.getScanStatus(),
  });

  const catalog = computed(() => catalogQuery.data.value ?? emptyCatalog());
  const scanStatus = computed(() => scanStatusQuery.data.value ?? null);
  const loading = computed(() => catalogQuery.isPending.value);
  const refreshing = computed(() => catalogQuery.isFetching.value && !catalogQuery.isPending.value);
  const error = computed(() => {
    const caught = catalogQuery.error.value ?? scanStatusQuery.error.value;
    return caught instanceof Error ? caught.message : caught ? "Could not load your library" : "";
  });

  watch(
    () => catalogQuery.dataUpdatedAt.value,
    () => {
      if (catalogQuery.isPlaceholderData.value) return;
      normalizePage(catalog.value.pagination.page);
    },
  );

  return { catalog, error, loading, refreshing, scanStatus };
}
