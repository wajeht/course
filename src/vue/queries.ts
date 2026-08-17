import { keepPreviousData, QueryClient, queryOptions } from "@tanstack/vue-query";

import {
  api,
  type CatalogDto,
  type CatalogFilters,
  type CourseDetailDto,
  type ScanStatus,
  type SettingsDto,
} from "@/api.js";

export interface CatalogQueryClient {
  getCatalog(filters?: CatalogFilters, signal?: AbortSignal): Promise<CatalogDto>;
  getScanStatus(signal?: AbortSignal): Promise<ScanStatus>;
}

export const queryKeys = {
  catalog: ["catalog"] as const,
  catalogList: (filters: CatalogFilters) => ["catalog", "list", filters] as const,
  course: (courseId: string) => ["catalog", "course", courseId] as const,
  scanStatus: ["scan-status"] as const,
  settings: ["settings"] as const,
};

export function createCourseQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 15 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

export function catalogQueryOptions(
  filters: CatalogFilters,
  client: Pick<CatalogQueryClient, "getCatalog"> = api,
) {
  const normalizedFilters = { ...filters, page: filters.page ?? 1 };
  return queryOptions({
    queryKey: queryKeys.catalogList(normalizedFilters),
    queryFn: ({ signal }) => client.getCatalog(normalizedFilters, signal),
    placeholderData: keepPreviousData,
  });
}

export function courseQueryOptions(courseId: string) {
  return queryOptions({
    queryKey: queryKeys.course(courseId),
    queryFn: ({ signal }): Promise<CourseDetailDto> => api.getCourse(courseId, signal),
  });
}

export function scanStatusQueryOptions(client: Pick<CatalogQueryClient, "getScanStatus"> = api) {
  return queryOptions({
    queryKey: queryKeys.scanStatus,
    queryFn: ({ signal }) => client.getScanStatus(signal),
  });
}

export function settingsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.settings,
    queryFn: ({ signal }): Promise<SettingsDto> => api.getSettings(signal),
  });
}
