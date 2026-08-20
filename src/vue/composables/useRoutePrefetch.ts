import { useQueryClient } from "@tanstack/vue-query";

import type { CatalogFilters } from "@/api.js";
import {
  catalogQueryOptions,
  courseQueryOptions,
  scanStatusQueryOptions,
  settingsQueryOptions,
} from "@/queries.js";

export function useRoutePrefetch() {
  const queryClient = useQueryClient();

  function catalog(filters: CatalogFilters): Promise<unknown> {
    return queryClient.prefetchQuery(catalogQueryOptions(filters));
  }

  return {
    catalog,
    course: (courseId: string) => queryClient.prefetchQuery(courseQueryOptions(courseId)),
    home: () => catalog({}),
    instructor: (instructor: string) => catalog({ instructor: [instructor], page: 1 }),
    library: () => Promise.all([catalog({}), queryClient.prefetchQuery(scanStatusQueryOptions())]),
    settings: () =>
      Promise.all([
        queryClient.prefetchQuery(scanStatusQueryOptions()),
        queryClient.prefetchQuery(settingsQueryOptions()),
      ]),
  };
}
