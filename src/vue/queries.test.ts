import { describe, expect, it } from "vitest";

import type { LibraryDto } from "@/api.js";
import {
  createVideosQueryClient,
  libraryQueryOptions,
  queryKeys,
  settingsQueryOptions,
} from "@/queries.js";

function library(): LibraryDto {
  return {
    videos: [],
    playlists: [],
    authors: [],
    tags: [],
    continueWatching: [],
    pagination: { page: 1, pageSize: 24, totalVideos: 0, totalPages: 0 },
  };
}

describe("videos query client", () => {
  it("reuses equivalent fresh library data", async () => {
    let requests = 0;
    const client = {
      async getLibrary() {
        requests++;
        return library();
      },
    };
    const queryClient = createVideosQueryClient();
    await queryClient.fetchQuery(libraryQueryOptions({}, client));
    await queryClient.fetchQuery(libraryQueryOptions({ page: 1 }, client));
    expect(requests).toBe(1);
    queryClient.clear();
  });

  it("keeps playlist details fresh when library lists are invalidated", async () => {
    const queryClient = createVideosQueryClient();
    const playlistKey = queryKeys.playlist("a".repeat(24));
    queryClient.setQueryData(playlistKey, { title: "Archive" });
    await queryClient.invalidateQueries({ queryKey: queryKeys.library, refetchType: "none" });
    expect(queryClient.getQueryState(playlistKey)?.isInvalidated).toBe(false);
    queryClient.clear();
  });

  it("keeps settings fresh until explicitly updated", () => {
    expect(settingsQueryOptions().staleTime).toBe(Infinity);
  });
});
