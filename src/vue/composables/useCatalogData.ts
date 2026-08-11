import { computed, watch, type ComputedRef } from "vue";

import type { CatalogDto, CatalogFilters, ScanStatus } from "../api.js";
import { useAsyncData } from "./useAsyncData.js";

export interface CatalogClient {
  getCatalog(filters?: CatalogFilters, signal?: AbortSignal): Promise<CatalogDto>;
  getScanStatus(signal?: AbortSignal): Promise<ScanStatus>;
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

export function useCatalogData(
  filters: ComputedRef<CatalogFilters>,
  client: CatalogClient,
  normalizePage: (page: number) => void,
) {
  const catalogRequest = useAsyncData(({ signal }) => client.getCatalog(filters.value, signal), {
    immediate: false,
  });
  const scanStatusRequest = useAsyncData(({ signal }) => client.getScanStatus(signal));

  watch(filters, () => void catalogRequest.refresh().catch(() => undefined), { immediate: true });
  watch(catalogRequest.data, (catalog) => {
    if (catalog) normalizePage(catalog.pagination.page);
  });

  const catalog = computed(() => catalogRequest.data.value ?? emptyCatalog());
  const scanStatus = computed(() => scanStatusRequest.data.value);
  const loading = computed(
    () => catalogRequest.loading.value && catalogRequest.data.value === null,
  );
  const refreshing = computed(
    () => catalogRequest.loading.value && catalogRequest.data.value !== null,
  );
  const error = computed(() => {
    const caught = catalogRequest.error.value ?? scanStatusRequest.error.value;
    return caught instanceof Error ? caught.message : caught ? "Could not load your library" : "";
  });

  return { catalog, error, loading, refreshing, scanStatus };
}
