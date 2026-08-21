import { useQueryClient } from "@tanstack/vue-query";

import type { LibraryFilters } from "@/api.js";
import {
  libraryQueryOptions,
  playlistQueryOptions,
  settingsQueryOptions,
  videoQueryOptions,
} from "@/queries.js";
import {
  loadHomePage,
  loadLibraryPage,
  loadPlayerPage,
  loadPlaylistPage,
  loadSettingsAccessPage,
  loadSettingsLibraryPage,
} from "@/router.js";

export function useRoutePrefetch() {
  const queryClient = useQueryClient();
  const library = (filters: LibraryFilters = {}) =>
    queryClient.prefetchQuery(libraryQueryOptions(filters));
  const settings = () => queryClient.prefetchQuery(settingsQueryOptions());

  return {
    home: () => Promise.all([library(), loadHomePage()]),
    library: () => Promise.all([library(), loadLibraryPage()]),
    playlist: (playlistId: string) =>
      Promise.all([
        queryClient.prefetchQuery(playlistQueryOptions(playlistId)),
        loadPlaylistPage(),
      ]),
    video: (videoId: string) =>
      Promise.all([queryClient.prefetchQuery(videoQueryOptions(videoId)), loadPlayerPage()]),
    settingsAccess: () => Promise.all([settings(), loadSettingsAccessPage()]),
    settingsLibrary: () => Promise.all([settings(), loadSettingsLibraryPage()]),
  };
}
