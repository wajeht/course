import { describe, expect, it } from "vitest";

import { displayName, naturalOrder } from "./names.js";

describe("media names", () => {
  it("natural-sorts numbered filenames", () => {
    expect(["10 - Last.mp4", "2 - Middle.mp4", "01 - First.mp4"].sort(naturalOrder)).toEqual([
      "01 - First.mp4",
      "2 - Middle.mp4",
      "10 - Last.mp4",
    ]);
  });

  it("removes number prefixes and extensions", () => {
    expect(displayName("01 - Volume 1 - Introduction.mp4")).toBe("Volume 1 - Introduction");
    expect(displayName("02_working_guard.mkv")).toBe("working guard");
  });
});
