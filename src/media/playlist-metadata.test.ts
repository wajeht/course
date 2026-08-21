import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createTemporaryDirectory } from "../test/resources.js";
import { readPlaylistMetadata } from "./playlist-metadata.js";

async function createPlaylistDirectory(): Promise<string> {
  return createTemporaryDirectory("playlist-metadata-");
}

describe("playlist metadata", () => {
  it("accepts versioned display metadata", async () => {
    const directory = await createPlaylistDirectory();
    await fs.writeFile(
      path.join(directory, "playlist.json"),
      JSON.stringify({
        version: 1,
        title: "Guard Retention",
        description: "Stay connected",
        cover: "cover.jpg",
        authors: ["Jane Smith", "jane smith", "John Doe"],
        tags: ["Guard", "guard", "Gi"],
        source: { provider: "BJJ Fanatics", url: "https://bjjfanatics.com/example" },
      }),
    );

    await expect(readPlaylistMetadata(directory)).resolves.toEqual({
      metadata: {
        version: 1,
        title: "Guard Retention",
        description: "Stay connected",
        cover: "cover.jpg",
        authors: ["Jane Smith", "John Doe"],
        tags: ["Guard", "Gi"],
        source: { provider: "BJJ Fanatics", url: "https://bjjfanatics.com/example" },
      },
      warning: null,
    });
  });

  it("rejects structural metadata", async () => {
    const directory = await createPlaylistDirectory();
    await fs.writeFile(
      path.join(directory, "playlist.json"),
      JSON.stringify({ version: 1, videos: ["01 - Video.mp4"] }),
    );

    const result = await readPlaylistMetadata(directory);

    expect(result.metadata).toBeNull();
    expect(result.warning).toContain("videos");
  });

  it("warns and falls back for invalid JSON", async () => {
    const directory = await createPlaylistDirectory();
    await fs.writeFile(path.join(directory, "playlist.json"), "not-json");

    const result = await readPlaylistMetadata(directory);
    expect(result.metadata).toBeNull();
    expect(result.warning).toBeTruthy();
  });
});
