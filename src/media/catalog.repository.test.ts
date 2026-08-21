import { beforeEach, describe, expect, it } from "vitest";

import type { Database } from "../db/db.js";
import { createTestDatabase } from "../test/resources.js";
import { createCatalogRepository } from "./catalog.repository.js";
import type { CatalogSnapshot, LessonRecord } from "./types.js";

let database: Database;

beforeEach(async () => {
  database = await createTestDatabase();
});

function video(id: string, sortOrder: number): LessonRecord {
  return {
    id,
    courseId: "playlist",
    sectionId: null,
    path: `${id}.mp4`,
    title: id,
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

describe("catalog repository", () => {
  it("reconciles chapters with one bounded delete query per video", async () => {
    const videos = [video("video-a", 0), video("video-b", 1)];
    const snapshot: CatalogSnapshot = {
      playlists: [
        {
          id: "playlist",
          path: "playlist",
          title: "Playlist",
          description: "",
          category: "Uncategorized",
          authors: [],
          tags: [],
          coverPath: null,
          sortOrder: 0,
        },
      ],
      sections: [],
      videos,
      chapters: videos.flatMap((item) => [
        {
          id: `${item.id}-chapter-a`,
          lessonId: item.id,
          title: "Introduction",
          startSeconds: 0,
          sortOrder: 0,
        },
        {
          id: `${item.id}-chapter-b`,
          lessonId: item.id,
          title: "Technique",
          startSeconds: 30,
          sortOrder: 1,
        },
      ]),
      skippedLessonIds: [],
    };
    const chapterDeletes: Array<{ bindings: readonly unknown[]; sql: string }> = [];
    database.connection.on("query", (query: { bindings?: readonly unknown[]; sql: string }) => {
      if (/^delete from [`"]?chapters/.test(query.sql)) {
        chapterDeletes.push({ bindings: query.bindings ?? [], sql: query.sql });
      }
    });

    await createCatalogRepository(database.connection).synchronizeCatalog(snapshot);

    expect(chapterDeletes).toHaveLength(2);
    expect(chapterDeletes.every((query) => query.bindings.length === 3)).toBe(true);
  });
});
