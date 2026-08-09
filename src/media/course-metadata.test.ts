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

async function temporaryDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "course-metadata-"));
  temporaryDirectories.push(directory);
  return directory;
}

describe("course metadata", () => {
  it("accepts versioned metadata", async () => {
    const directory = await temporaryDirectory();
    await fs.writeFile(
      path.join(directory, "course.json"),
      JSON.stringify({
        version: 1,
        title: "Guard Retention",
        description: "Stay connected",
        cover: "cover.jpg",
      }),
    );

    await expect(readCourseMetadata(directory)).resolves.toEqual({
      metadata: {
        version: 1,
        title: "Guard Retention",
        description: "Stay connected",
        cover: "cover.jpg",
      },
      warning: null,
    });
  });

  it("warns and falls back for invalid JSON", async () => {
    const directory = await temporaryDirectory();
    await fs.writeFile(path.join(directory, "course.json"), "not-json");

    const result = await readCourseMetadata(directory);
    expect(result.metadata).toBeNull();
    expect(result.warning).toBeTruthy();
  });
});
