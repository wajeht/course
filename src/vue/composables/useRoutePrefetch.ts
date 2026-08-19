import { useQueryClient } from "@tanstack/vue-query";

import type { CatalogFilters } from "@/api.js";
import {
  catalogQueryOptions,
  courseQueryOptions,
  scanStatusQueryOptions,
  settingsQueryOptions,
} from "@/queries.js";
import {
  loadCoursePage,
  loadHomePage,
  loadInstructorPage,
  loadLibraryPage,
  loadPlayerPage,
  loadSettingsPage,
} from "@/router.js";

export function useRoutePrefetch() {
  const queryClient = useQueryClient();

  function catalog(filters: CatalogFilters): Promise<unknown> {
    return queryClient.prefetchQuery(catalogQueryOptions(filters));
  }

  return {
    catalog,
    course: (courseId: string) =>
      Promise.all([loadCoursePage(), queryClient.prefetchQuery(courseQueryOptions(courseId))]),
    home: () => Promise.all([loadHomePage(), catalog({})]),
    instructor: (instructor: string) =>
      Promise.all([loadInstructorPage(), catalog({ instructor, page: 1 })]),
    library: () =>
      Promise.all([
        loadLibraryPage(),
        catalog({}),
        queryClient.prefetchQuery(scanStatusQueryOptions()),
      ]),
    player: loadPlayerPage,
    settings: () =>
      Promise.all([
        loadSettingsPage(),
        queryClient.prefetchQuery(scanStatusQueryOptions()),
        queryClient.prefetchQuery(settingsQueryOptions()),
      ]),
  };
}
