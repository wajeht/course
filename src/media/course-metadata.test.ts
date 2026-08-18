import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readCourseMetadata } from "./course-metadata.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true })),
  );
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "course-metadata-"));
  temporaryDirectories.push(directory);
  return directory;
}

describe("course metadata", () => {
  it("accepts versioned metadata", async () => {
    const directory = await createTemporaryDirectory();
    await fs.writeFile(
      path.join(directory, "course.json"),
      JSON.stringify({
        version: 1,
        title: "Guard Retention",
        description: "Stay connected",
        cover: "cover.jpg",
        category: "Martial Arts",
        instructors: ["Jane Smith", "jane smith", "John Doe"],
        tags: ["Guard", "Gi"],
        source: { provider: "BJJ Fanatics", url: "https://bjjfanatics.com/example" },
      }),
    );

    await expect(readCourseMetadata(directory)).resolves.toEqual({
      metadata: {
        version: 1,
        title: "Guard Retention",
        description: "Stay connected",
        cover: "cover.jpg",
        category: "Martial Arts",
        instructors: ["Jane Smith", "John Doe"],
        tags: ["Guard", "Gi"],
        source: { provider: "BJJ Fanatics", url: "https://bjjfanatics.com/example" },
      },
      warning: null,
    });
  });

  it("rejects video metadata in course.json", async () => {
    const directory = await createTemporaryDirectory();
    await fs.writeFile(
      path.join(directory, "course.json"),
      JSON.stringify({
        version: 1,
        title: "Guard Retention",
        lessons: [
          {
            path: "01 - Lesson.mp4",
            chapters: [{ title: "Introduction", startSeconds: 0 }],
          },
        ],
      }),
    );

    const result = await readCourseMetadata(directory);

    expect(result.metadata).toBeNull();
    expect(result.warning).toContain("lessons");
  });

  it("warns and falls back for invalid JSON", async () => {
    const directory = await createTemporaryDirectory();
    await fs.writeFile(path.join(directory, "course.json"), "not-json");

    const result = await readCourseMetadata(directory);
    expect(result.metadata).toBeNull();
    expect(result.warning).toBeTruthy();
  });
});
