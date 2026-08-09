import path from "node:path";

import { describe, expect, it } from "vitest";

import { createConfiguration } from "./configuration.js";

describe("createConfiguration", () => {
  it("uses opinionated local defaults", () => {
    const configuration = createConfiguration({ APP_ENV: "development" });

    expect(configuration.media.dataDirectory).toBe(path.resolve("data"));
    expect(configuration.media.videosDirectory).toBe("/Volumes/plex/videos");
  });

  it("uses the same defaults for a direct production start", () => {
    const configuration = createConfiguration({ APP_ENV: "production" });

    expect(configuration.media.dataDirectory).toBe(path.resolve("data"));
    expect(configuration.media.videosDirectory).toBe("/Volumes/plex/videos");
  });

  it("honors explicit container paths", () => {
    const configuration = createConfiguration({
      APP_ENV: "production",
      DATA_DIR: "/data",
      VIDEOS_DIR: "/videos",
    });

    expect(configuration.media.dataDirectory).toBe("/data");
    expect(configuration.media.videosDirectory).toBe("/videos");
  });
});
