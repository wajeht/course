import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createTemporaryDirectory } from "../test/resources.js";
import { readCourseMetadata } from "./playlist-metadata.js";

async function createCourseDirectory(): Promise<string> {
  return createTemporaryDirectory("playlist-metadata-");
}

describe("playlist metadata", () => {
  it("accepts versioned metadata", async () => {
    const directory = await createCourseDirectory();
    await fs.writeFile(
      path.join(directory, "playlist.json"),
      JSON.stringify({
        version: 1,
        title: "Guard Retention",
        description: "Stay connected",
        cover: "cover.jpg",
        category: "Martial Arts",
        authors: ["Jane Smith", "jane smith", "John Doe"],
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
        authors: ["Jane Smith", "John Doe"],
        tags: ["Guard", "Gi"],
        source: { provider: "BJJ Fanatics", url: "https://bjjfanatics.com/example" },
      },
      warning: null,
    });
  });

  it("rejects video metadata in playlist.json", async () => {
    const directory = await createCourseDirectory();
    await fs.writeFile(
      path.join(directory, "playlist.json"),
      JSON.stringify({
        version: 1,
        title: "Guard Retention",
        videos: [
          {
            path: "01 - Video.mp4",
            chapters: [{ title: "Introduction", startSeconds: 0 }],
          },
        ],
      }),
    );

    const result = await readCourseMetadata(directory);

    expect(result.metadata).toBeNull();
    expect(result.warning).toContain("videos");
  });

  it("warns and falls back for invalid JSON", async () => {
    const directory = await createCourseDirectory();
    await fs.writeFile(path.join(directory, "playlist.json"), "not-json");

    const result = await readCourseMetadata(directory);
    expect(result.metadata).toBeNull();
    expect(result.warning).toBeTruthy();
  });
});
