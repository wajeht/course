import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createTemporaryDirectory } from "../test/resources.js";
import { readCourseMetadata } from "./course-metadata.js";

async function createCourseDirectory(): Promise<string> {
  return createTemporaryDirectory("course-metadata-");
}

describe("course metadata", () => {
  it("accepts versioned metadata", async () => {
    const directory = await createCourseDirectory();
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
    const directory = await createCourseDirectory();
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
    const directory = await createCourseDirectory();
    await fs.writeFile(path.join(directory, "course.json"), "not-json");

    const result = await readCourseMetadata(directory);
    expect(result.metadata).toBeNull();
    expect(result.warning).toBeTruthy();
  });
});
