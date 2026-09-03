import { describe, expect, it } from "vitest";

import { libraryQuerySchema } from "./library.schema.js";

describe("libraryQuerySchema", () => {
  it("normalizes single and repeated filters to arrays", () => {
    expect(
      libraryQuerySchema.parse({
        author: "Jane Smith",
        tag: ["Archive", "Music"],
        view: "playlists",
      }),
    ).toMatchObject({
      author: ["Jane Smith"],
      tag: ["Archive", "Music"],
      view: "playlists",
    });
  });

  it("rejects unsupported library views", () => {
    expect(() => libraryQuerySchema.parse({ view: "collections" })).toThrow();
  });
});
