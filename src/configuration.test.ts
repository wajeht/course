import path from "node:path";

import { describe, expect, it } from "vitest";

import { createConfiguration } from "./configuration.js";

describe("createConfiguration", () => {
  it("uses writable local development defaults", () => {
    const configuration = createConfiguration({ APP_ENV: "development" });

    expect(configuration.media.dataDirectory).toBe(path.resolve("data"));
    expect(configuration.media.videosDirectory).toBe("/Volumes/plex/videos");
  });

  it("keeps container paths as production defaults", () => {
    const configuration = createConfiguration({ APP_ENV: "production" });

    expect(configuration.media.dataDirectory).toBe("/data");
    expect(configuration.media.videosDirectory).toBe("/videos");
  });

  it("honors explicit paths", () => {
    const configuration = createConfiguration({
      APP_ENV: "development",
      DATA_DIR: "/tmp/course-data",
      VIDEOS_DIR: "/tmp/course-videos",
    });

    expect(configuration.media.dataDirectory).toBe("/tmp/course-data");
    expect(configuration.media.videosDirectory).toBe("/tmp/course-videos");
  });
});
