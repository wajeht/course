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
    props: { activeVideoId: videoId, open: true, playlist, resetting },
    global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
  });
}

describe("PlayerPlaylistSidebar", () => {
  it("keeps the mobile header below the iOS status bar", async () => {
    const wrapper = await mountSidebar();

    expect(wrapper.get("header").classes()).toContain(
      "max-[860px]:pt-[calc(1.25rem+env(safe-area-inset-top))]",
    );
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
