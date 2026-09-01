import { describe, expect, it } from "vitest";

import { matchVideoSearch } from "./video-search.js";

const video = {
  title: "Guillotine from Closed Guard",
  description: "A detailed finishing sequence",
  authors: ["Gordon Ryan"],
  playlistTitle: "Attacking the Guard",
  tags: ["Submission"],
};

describe("video search", () => {
  it("matches misspelled words and returns the original highlight range", () => {
    expect(matchVideoSearch(video, "guilotine")).toEqual({
      score: 66,
      matches: [
        {
          field: "title",
          value: video.title,
          ranges: [{ start: 0, end: 10 }],
        },
      ],
    });
  });

  it("ranks title matches ahead of metadata matches", () => {
    const titleMatch = matchVideoSearch(video, "guard");
    const metadataMatch = matchVideoSearch({ ...video, title: "Finishing mechanics" }, "guard");

    expect(titleMatch?.score).toBeLessThan(metadataMatch?.score ?? Infinity);
    expect(metadataMatch?.matches[0]?.field).toBe("playlist");
  });

  it("requires every query word to match", () => {
    expect(matchVideoSearch(video, "closed wrestling")).toBeNull();
  });
});
