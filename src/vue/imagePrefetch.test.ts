import { describe, expect, it, vi } from "vitest";

import type { LibraryDto, VideoPlayerDetailDto } from "@/api.js";
import {
  createImagePrefetcher,
  libraryImageUrls,
  prepareImagePrefetch,
  resetImagePrefetch,
  videoImageUrls,
} from "@/imagePrefetch.js";

function library(): LibraryDto {
  const video = {
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
  };
  return {
    authors: [],
    continueWatching: [{ ...video, coverUrl: "/covers/continue.jpg" }],
    pagination: { page: 1, pageSize: 24, totalPages: 1, totalVideos: 1 },
    playlists: [
      {
        authors: [],
        completedCount: 0,
        coverUrl: "/covers/playlist.jpg",
        description: "",
        durationSeconds: 60,
        id: "2".repeat(24),
        nextVideoId: video.id,
        progressPercent: 0,
        source: null,
        tags: [],
        title: "Playlist",
        videoCount: 1,
      },
    ],
    tags: [],
    videos: [video],
  };
}

describe("image prefetch", () => {
  it("selects only images rendered by the destination", () => {
    const result = library();

    expect(libraryImageUrls(result, "author")).toEqual([
      "/covers/playlist.jpg",
      "/covers/video.jpg",
    ]);
    expect(libraryImageUrls(result, "home")).toEqual(["/covers/continue.jpg"]);
    expect(libraryImageUrls(result, "videos")).toEqual(["/covers/video.jpg"]);
    expect(libraryImageUrls(result, "playlists")).toEqual(["/covers/playlist.jpg"]);
  });

  it("selects the player poster and chapter thumbnails", () => {
    const detail: VideoPlayerDetailDto = {
      playlist: null,
      video: {
        ...library().videos[0]!,
        chapters: [
          { startSeconds: 0, thumbnailUrl: "/covers/chapter-0.jpg", title: "Start" },
          { startSeconds: 60, thumbnailUrl: null, title: "Finish" },
        ],
      },
    };

    expect(videoImageUrls(detail)).toEqual(["/covers/video.jpg", "/covers/chapter-0.jpg"]);
  });

  it("starts immediately, deduplicates URLs, and limits concurrency", () => {
    const requests: Array<{ complete: () => void; url: string }> = [];
    const loadImage = vi.fn((url: string, complete: () => void) => {
      requests.push({ complete, url });
    });
    const { prefetch } = createImagePrefetcher(loadImage, 2);

    prefetch(["/one.jpg", "/one.jpg", "/two.jpg", "/three.jpg"]);

    expect(loadImage.mock.calls.map(([url]) => url)).toEqual(["/one.jpg", "/two.jpg"]);
    requests[0]!.complete();
    expect(loadImage.mock.calls.map(([url]) => url)).toEqual([
      "/one.jpg",
      "/two.jpg",
      "/three.jpg",
    ]);

    requests[1]!.complete();
    requests[2]!.complete();
    prefetch(["/one.jpg"]);
    expect(loadImage.mock.calls.map(([url]) => url)).toEqual([
      "/one.jpg",
      "/two.jpg",
      "/three.jpg",
      "/one.jpg",
    ]);
  });

  it("drops older queued images when newer intent arrives", () => {
    const requests: Array<{ complete: () => void; url: string }> = [];
    const loadImage = vi.fn((url: string, complete: () => void) => {
      requests.push({ complete, url });
    });
    const { prefetch } = createImagePrefetcher(loadImage, 1);

    prefetch(["/active.jpg", "/old-queued.jpg"]);
    prefetch(["/new.jpg"]);
    requests[0]!.complete();

    expect(loadImage.mock.calls.map(([url]) => url)).toEqual(["/active.jpg", "/new.jpg"]);
  });

  it("allows an in-flight URL to be retried after reset", () => {
    const requests: Array<{ complete: () => void; url: string }> = [];
    const loadImage = vi.fn((url: string, complete: () => void) => {
      requests.push({ complete, url });
    });
    const { prefetch, reset } = createImagePrefetcher(loadImage, 1);

    prefetch(["/same.jpg"]);
    reset();
    prefetch(["/same.jpg"]);
    requests[0]!.complete();
    requests[1]!.complete();
    prefetch(["/same.jpg"]);

    expect(loadImage.mock.calls.map(([url]) => url)).toEqual([
      "/same.jpg",
      "/same.jpg",
      "/same.jpg",
    ]);
  });

  it("ignores images returned by an older destination request", () => {
    const queueImages = vi.fn<(urls: ReadonlyArray<string | null>) => void>();
    const completeOlderPrefetch = prepareImagePrefetch(queueImages);
    const completeLatestPrefetch = prepareImagePrefetch(queueImages);

    completeOlderPrefetch(["/old.jpg"]);
    completeLatestPrefetch(["/latest.jpg"]);

    expect(queueImages.mock.calls).toEqual([[[]], [[]], [["/latest.jpg"]]]);
  });

  it("ignores destination responses created before reset", () => {
    const queueImages = vi.fn<(urls: ReadonlyArray<string | null>) => void>();
    const completePrefetch = prepareImagePrefetch(queueImages);

    resetImagePrefetch();
    completePrefetch(["/old-session.jpg"]);

    expect(queueImages.mock.calls).toEqual([[[]]]);
  });
});
