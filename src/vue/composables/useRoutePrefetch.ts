import { useQueryClient } from "@tanstack/vue-query";

import type { LibraryFilters } from "@/api.js";
import {
  libraryImageUrls,
  prepareImagePrefetch,
  videoImageUrls,
  type LibraryImageTarget,
} from "@/imagePrefetch.js";
import { libraryQueryOptions, settingsQueryOptions, videoQueryOptions } from "@/queries.js";
import {
  loadAuthorPage,
  loadHomePage,
  loadVideosPage,
  loadPlayerPage,
  loadSettingsAccessPage,
  loadSettingsLibraryPage,
} from "@/router.js";

export function useRoutePrefetch() {
  const queryClient = useQueryClient();
  const library = async (filters: LibraryFilters, target: LibraryImageTarget) => {
    const prefetchTargetImages = prepareImagePrefetch();
    const result = await queryClient.fetchQuery(libraryQueryOptions(filters));
    prefetchTargetImages(libraryImageUrls(result, target));
    return result;
  };
  const video = async (videoId: string) => {
    const prefetchTargetImages = prepareImagePrefetch();
    const result = await queryClient.fetchQuery(videoQueryOptions(videoId));
    prefetchTargetImages(videoImageUrls(result));
    return result;
  };
  const settings = () => queryClient.prefetchQuery(settingsQueryOptions());

  return {
    home: () => Promise.all([library({}, "home"), loadHomePage()]),
    videos: () => Promise.all([library({}, "videos"), loadVideosPage()]),
    author: (authorName: string) =>
      Promise.all([library({ author: [authorName] }, "author"), loadAuthorPage()]),
    video: (videoId: string) => Promise.all([video(videoId), loadPlayerPage()]),
    settingsAccess: () => Promise.all([settings(), loadSettingsAccessPage()]),
    settingsLibrary: () => Promise.all([settings(), loadSettingsLibraryPage()]),
  };
}
