// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createApp, effectScope } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, type LibraryDto } from "@/api.js";
import { useDestinationPrefetch } from "@/composables/useDestinationPrefetch.js";

function library(): LibraryDto {
  return {
    authors: [],
    continueWatching: [],
    pagination: { page: 1, pageSize: 24, totalPages: 1, totalVideos: 1 },
    playlists: [],
    tags: [],
    videos: [
      {
        authors: [],
        completed: false,
        coverUrl: "/covers/video.jpg",
        description: "",
        durationSeconds: 60,
        id: "1".repeat(24),
        playlistId: null,
        playlistSectionId: null,
        playlistSectionTitle: null,
        playlistTitle: null,
        positionSeconds: 0,
        progressPercent: 0,
        source: null,
        tags: [],
        title: "Video",
      },
    ],
  };
}

afterEach(() => vi.restoreAllMocks());

describe("useDestinationPrefetch", () => {
  it("fetches a library destination and starts its image requests", async () => {
    vi.spyOn(api, "getLibrary").mockResolvedValue(library());
    const requestedImages: HTMLImageElement[] = [];
    const imageSource = vi
      .spyOn(HTMLImageElement.prototype, "src", "set")
      .mockImplementation(function (this: HTMLImageElement, source) {
        requestedImages.push(this);
        expect(source).toBe("/covers/video.jpg");
      });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const app = createApp({});
    app.use(VueQueryPlugin, { queryClient });
    const scope = effectScope();
    const destinationPrefetch = app.runWithContext(() => scope.run(() => useDestinationPrefetch()));
    if (!destinationPrefetch) throw new Error("Destination prefetch did not initialize");

    await destinationPrefetch.prefetchLibrary({}, "videos");

    expect(api.getLibrary).toHaveBeenCalledWith({ page: 1 }, expect.any(AbortSignal));
    expect(imageSource).toHaveBeenCalledOnce();
    requestedImages[0]?.dispatchEvent(new Event("load"));
    scope.stop();
    queryClient.clear();
  });
});
