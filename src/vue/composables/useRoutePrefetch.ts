import { useQueryClient } from "@tanstack/vue-query";

import type { LibraryFilters } from "@/api.js";
import {
  libraryQueryOptions,
  playlistQueryOptions,
  settingsQueryOptions,
  videoQueryOptions,
} from "@/queries.js";
import {
  loadAuthorPage,
  loadHomePage,
  loadVideosPage,
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
    videos: () => Promise.all([library(), loadVideosPage()]),
    author: (authorName: string) =>
      Promise.all([library({ author: [authorName] }), loadAuthorPage()]),
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
