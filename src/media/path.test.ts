import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createTemporaryDirectory } from "../test/resources.js";
import { resolveContainedPath } from "./path.js";

describe("resolveContainedPath", () => {
  it("resolves files inside the configured root", async () => {
    const root = await createTemporaryDirectory("playlist-path-root-");
    const video = path.join(root, "playlist", "video.mp4");
    await fs.mkdir(path.dirname(video));
    await fs.writeFile(video, "video");

    await expect(resolveContainedPath(root, "playlist/video.mp4")).resolves.toBe(
      await fs.realpath(video),
    );
  });

  it("rejects path traversal", async () => {
    const root = await createTemporaryDirectory("playlist-path-root-");

    await expect(resolveContainedPath(root, "../secret.mp4")).rejects.toThrow(
      "Path leaves the configured media directory",
    );
  });

  it("rejects symlinks that resolve outside the configured root", async () => {
    const root = await createTemporaryDirectory("playlist-path-root-");
    const outside = await createTemporaryDirectory("playlist-path-outside-");
    await fs.writeFile(path.join(outside, "secret.mp4"), "secret");
    await fs.symlink(outside, path.join(root, "linked"));

    await expect(resolveContainedPath(root, "linked/secret.mp4")).rejects.toThrow(
      "Path leaves the configured media directory",
    );
  });
});
