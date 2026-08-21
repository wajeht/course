import { useQueryClient } from "@tanstack/vue-query";

import type { CatalogFilters } from "@/api.js";
import {
  catalogQueryOptions,
  courseQueryOptions,
  lessonQueryOptions,
  scanStatusQueryOptions,
  settingsQueryOptions,
} from "@/queries.js";
import {
  loadCoursePage,
  loadHomePage,
  loadInstructorPage,
  loadLibraryPage,
  loadPlayerPage,
  loadSettingsAccessPage,
  loadSettingsLibraryPage,
} from "@/router.js";

export function useRoutePrefetch() {
  const queryClient = useQueryClient();

  function catalog(filters: CatalogFilters): Promise<unknown> {
    return queryClient.prefetchQuery(catalogQueryOptions(filters));
  }

  return {
    catalog,
    course: (courseId: string) =>
      Promise.all([queryClient.prefetchQuery(courseQueryOptions(courseId)), loadCoursePage()]),
    home: () => Promise.all([catalog({}), loadHomePage()]),
    instructor: (instructor: string) =>
      Promise.all([catalog({ instructor: [instructor], page: 1 }), loadInstructorPage()]),
    lesson: (lessonId: string) =>
      Promise.all([queryClient.prefetchQuery(lessonQueryOptions(lessonId)), loadPlayerPage()]),
    library: () => Promise.all([catalog({}), loadLibraryPage()]),
    settingsAccess: () => loadSettingsAccessPage(),
    settingsLibrary: () =>
      Promise.all([
        queryClient.prefetchQuery(scanStatusQueryOptions()),
        queryClient.prefetchQuery(settingsQueryOptions()),
        loadSettingsLibraryPage(),
      ]),
  };
}
