import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createTemporaryDirectory } from "../test/resources.js";
import { readVideoMetadata } from "./video-metadata.js";

async function videoFilename(): Promise<string> {
  const directory = await createTemporaryDirectory("video-metadata-");
  return path.join(directory, "01 - Video.mp4");
}

describe("video metadata", () => {
  it("reads chapters from the exact video sidecar", async () => {
    const video = await videoFilename();
    await fs.writeFile(
      `${video}.json`,
      JSON.stringify({
        version: 1,
        chapters: [
          { title: "Introduction", startSeconds: 0 },
          { title: "Core movement", startSeconds: 416 },
        ],
      }),
    );

    await expect(readVideoMetadata(video)).resolves.toEqual({
      metadata: {
        version: 1,
        chapters: [
          { title: "Introduction", startSeconds: 0 },
          { title: "Core movement", startSeconds: 416 },
        ],
      },
      warning: null,
    });
  });

  it("rejects chapters that are not strictly increasing", async () => {
    const video = await videoFilename();
    await fs.writeFile(
      `${video}.json`,
      JSON.stringify({
        version: 1,
        chapters: [
          { title: "Later", startSeconds: 20 },
          { title: "Earlier", startSeconds: 10 },
        ],
      }),
    );

    const result = await readVideoMetadata(video);

    expect(result.metadata).toBeNull();
    expect(result.warning).toContain("strictly increasing");
  });

  it("rejects fields other than chapters", async () => {
    const video = await videoFilename();
    await fs.writeFile(
      `${video}.json`,
      JSON.stringify({
        version: 1,
        chapters: [{ title: "Introduction", startSeconds: 0 }],
        transcript: { language: "en" },
      }),
    );

    const result = await readVideoMetadata(video);

    expect(result.metadata).toBeNull();
    expect(result.warning).toContain("transcript");
  });

  it("ignores a missing sidecar", async () => {
    await expect(readVideoMetadata(await videoFilename())).resolves.toEqual({
      metadata: null,
      warning: null,
    });
  });
});
