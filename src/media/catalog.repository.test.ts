import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createConfiguration } from "../configuration.js";
import { createDatabase, type Database } from "../db/db.js";
import { createLogger } from "../logger.js";
import { createCatalogRepository } from "./catalog.repository.js";
import type { CatalogSnapshot, LessonRecord } from "./types.js";

let database: Database;

beforeEach(async () => {
  database = await createDatabase(createConfiguration({ APP_ENV: "testing" }), createLogger());
});

afterEach(async () => database.close());

function lesson(id: string, sortOrder: number): LessonRecord {
  return {
    id,
    courseId: "course",
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
  it("reconciles chapters with one bounded delete query per lesson", async () => {
    const lessons = [lesson("lesson-a", 0), lesson("lesson-b", 1)];
    const snapshot: CatalogSnapshot = {
      courses: [
        {
          id: "course",
          path: "course",
          title: "Course",
          description: "",
          category: "Uncategorized",
          instructors: [],
          tags: [],
          coverPath: null,
          sortOrder: 0,
        },
      ],
      sections: [],
      lessons,
      chapters: lessons.flatMap((item) => [
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
