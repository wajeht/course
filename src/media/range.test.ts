import { describe, expect, it } from "vitest";

import { byteRange } from "./range.js";

describe("byteRange", () => {
  it("parses bounded, open, and suffix ranges", () => {
    expect(byteRange("bytes=10-19", 100)).toEqual({ start: 10, end: 19 });
    expect(byteRange("bytes=90-", 100)).toEqual({ start: 90, end: 99 });
    expect(byteRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
  });

  it("rejects multiple and out-of-bounds ranges", () => {
    expect(() => byteRange("bytes=0-1,4-5", 100)).toThrow();
    expect(() => byteRange("bytes=100-", 100)).toThrow();
  });
});
