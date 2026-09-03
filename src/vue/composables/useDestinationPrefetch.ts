import { useQueryClient } from "@tanstack/vue-query";

import type { LibraryFilters } from "@/api.js";
import {
  libraryImageUrls,
  prepareImagePrefetch,
  videoImageUrls,
  type LibraryImageTarget,
} from "@/imagePrefetch.js";
import { libraryQueryOptions, videoQueryOptions } from "@/queries.js";

export function useDestinationPrefetch() {
  const queryClient = useQueryClient();

  async function prefetchLibrary(filters: LibraryFilters, target: LibraryImageTarget) {
    const prefetchTargetImages = prepareImagePrefetch();
    const library = await queryClient.fetchQuery(libraryQueryOptions(filters));
    prefetchTargetImages(libraryImageUrls(library, target));
    return library;
  }

  async function prefetchVideo(videoId: string) {
    const prefetchTargetImages = prepareImagePrefetch();
    const detail = await queryClient.fetchQuery(videoQueryOptions(videoId));
    prefetchTargetImages(videoImageUrls(detail));
    return detail;
  }

  return { prefetchLibrary, prefetchVideo };
}
