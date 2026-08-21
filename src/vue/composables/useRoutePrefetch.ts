import { useQueryClient } from "@tanstack/vue-query";

import type { CatalogFilters } from "@/api.js";
import {
  catalogQueryOptions,
  courseQueryOptions,
  lessonQueryOptions,
  scanStatusQueryOptions,
  settingsQueryOptions,
} from "@/queries.js";
import { loadPlayerPage } from "@/router.js";

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
    lesson: (lessonId: string) =>
      Promise.all([queryClient.prefetchQuery(lessonQueryOptions(lessonId)), loadPlayerPage()]),
    library: () => catalog({}),
    settings: () =>
      Promise.all([
        queryClient.prefetchQuery(scanStatusQueryOptions()),
        queryClient.prefetchQuery(settingsQueryOptions()),
      ]),
  };
}
