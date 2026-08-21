import { beforeEach, describe, expect, it } from "vitest";

import type { Database } from "../db/db.js";
import { createTestDatabase } from "../test/resources.js";
import { createLibraryRepository } from "./library.repository.js";
import type { LibrarySnapshot, VideoRecord } from "./types.js";

let database: Database;

beforeEach(async () => {
  database = await createTestDatabase();
});

function video(id: string, sortOrder: number): VideoRecord {
  return {
    id,
    path: `Playlist/${id}.mp4`,
    playlistId: "playlist",
    playlistSectionId: null,
    title: id,
    description: "",
    tags: [],
    coverPath: null,
    sourceProvider: null,
    sourceUrl: null,
    sortOrder,
    durationSeconds: 60,
    sizeBytes: 100,
    container: "mp4",
    videoCodec: "h264",
    audioCodec: "aac",
    browserCompatible: true,
    modifiedAt: "2026-08-18T12:00:00.000Z",
  };
}

function snapshot(videos = [video("video-a", 0), video("video-b", 1)]): LibrarySnapshot {
  return {
    playlists: [
      {
        id: "playlist",
        path: "Playlist",
        title: "Playlist",
        description: "",
        tags: [],
        coverPath: null,
        sourceProvider: null,
        sourceUrl: null,
        sortOrder: 0,
      },
    ],
    playlistSections: [],
    videos,
    authors: [],
    playlistAuthors: [],
    videoAuthors: [],
    chapters: videos.flatMap((item) => [
      {
        id: `${item.id}-chapter-a`,
        videoId: item.id,
        title: "Introduction",
        startSeconds: 0,
        sortOrder: 0,
      },
      {
        id: `${item.id}-chapter-b`,
        videoId: item.id,
        title: "Technique",
        startSeconds: 30,
        sortOrder: 1,
      },
    ]),
    skippedVideoIds: [],
  };
}

describe("library repository", () => {
  it("reconciles chapters with one bounded delete query per video", async () => {
    const library = snapshot();
    const chapterDeletes: Array<{ bindings: readonly unknown[]; sql: string }> = [];
    database.connection.on("query", (query: { bindings?: readonly unknown[]; sql: string }) => {
      if (/^delete from [`"]?chapters/.test(query.sql)) {
        chapterDeletes.push({ bindings: query.bindings ?? [], sql: query.sql });
      }
    });

    await createLibraryRepository(database.connection).synchronizeLibrary(library);

    expect(chapterDeletes).toHaveLength(2);
    expect(chapterDeletes.every((query) => query.bindings.length === 3)).toBe(true);
  });

  it("removes stale author relationships and orphaned authors", async () => {
    const library = snapshot([video("video-a", 0)]);
    library.authors.push({ id: "author", name: "Author", normalizedName: "author" });
    library.videoAuthors.push({ videoId: "video-a", authorId: "author", sortOrder: 0 });
    const repository = createLibraryRepository(database.connection);
    await repository.synchronizeLibrary(library);

    await repository.synchronizeLibrary(snapshot([video("video-a", 0)]));

    await expect(database.connection("video_authors").select()).resolves.toEqual([]);
    await expect(database.connection("authors").select()).resolves.toEqual([]);
  });
});
