// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import type { PlaylistDetailDto, VideoDetailDto } from "@/api.js";

import PlayerVideoDetails from "./PlayerVideoDetails.vue";

const videoId = "1".repeat(24);
const playlistId = "2".repeat(24);
const video: VideoDetailDto = {
  authors: [],
  chapters: [],
  completed: false,
  coverUrl: null,
  description: "",
  durationSeconds: 120,
  id: videoId,
  playlistId,
  playlistSectionId: null,
  playlistSectionTitle: null,
  playlistTitle: "Saved Collection",
  positionSeconds: 0,
  progressPercent: 0,
  source: null,
  tags: [],
  title: "Example video",
};
const playlist: PlaylistDetailDto = {
  authors: [],
  completedCount: 0,
  coverUrl: null,
  description: "",
  durationSeconds: 120,
  id: playlistId,
  nextVideoId: videoId,
  progressPercent: 0,
  sections: [],
  source: null,
  tags: [],
  title: "Saved Collection",
  videoCount: 1,
};

describe("PlayerVideoDetails", () => {
  it("keeps the playlist action mobile-only", async () => {
    const wrapper = mount(PlayerVideoDetails, {
      props: { currentTime: 0, playlist, resetting: false, video },
    });

    const action = wrapper.get('[aria-label="Open playlist Saved Collection"]');

    expect(action.classes()).toContain("min-[861px]:!hidden");

    await action.trigger("click");

    expect(wrapper.emitted("openPlaylist")).toHaveLength(1);
  });

  it("does not show a playlist action for an independent video", () => {
    const wrapper = mount(PlayerVideoDetails, {
      props: { currentTime: 0, playlist: null, resetting: false, video },
    });

    expect(wrapper.find('[aria-label^="Open playlist"]').exists()).toBe(false);
  });
});
