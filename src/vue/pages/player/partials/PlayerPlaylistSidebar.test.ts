// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";

import type { PlaylistDetailDto } from "@/api.js";

import PlayerPlaylistSidebar from "./PlayerPlaylistSidebar.vue";

const playlistId = "1".repeat(24);
const videoId = "2".repeat(24);
const playlist: PlaylistDetailDto = {
  authors: [],
  completedCount: 0,
  coverUrl: null,
  description: "",
  durationSeconds: 120,
  id: playlistId,
  nextVideoId: videoId,
  progressPercent: 0,
  sections: [
    {
      id: null,
      title: "Videos",
      videos: [
        {
          authors: [],
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
        },
      ],
    },
  ],
  source: null,
  tags: [],
  title: "Saved Collection",
  videoCount: 1,
};

async function mountSidebar(resetting = false) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/videos/:videoId", name: "player", component: { template: "<div />" } }],
  });
  await router.push(`/videos/${videoId}`);
  await router.isReady();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return mount(PlayerPlaylistSidebar, {
    props: { activeVideoId: videoId, playlist, resetting },
    global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
  });
}

describe("PlayerPlaylistSidebar", () => {
  it("exposes the playlist as a labelled panel without a drawer close action", async () => {
    const wrapper = await mountSidebar();
    const panel = wrapper.get("aside");

    expect(panel.attributes("aria-labelledby")).toBe(wrapper.get("h2").attributes("id"));
    expect(wrapper.find('[aria-label="Close playlist"]').exists()).toBe(false);
  });

  it("keeps the playlist reset action in an overflow menu", async () => {
    const wrapper = await mountSidebar();

    await wrapper.get('[aria-label="Playlist actions"]').trigger("click");
    expect(wrapper.get('[role="menuitem"]').text()).toBe("Reset playlist progress");

    await wrapper.get('[role="menuitem"]').trigger("click");

    expect(wrapper.emitted("reset")).toHaveLength(1);
  });

  it("shows the pending reset state", async () => {
    const wrapper = await mountSidebar(true);

    await wrapper.get('[aria-label="Playlist actions"]').trigger("click");

    expect(wrapper.get('[role="menuitem"]').text()).toContain("Resetting");
    expect(wrapper.get('[role="menuitem"]').attributes("disabled")).toBeDefined();
  });
});
