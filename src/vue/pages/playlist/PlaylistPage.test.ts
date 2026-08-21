// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";

import { api } from "@/api.js";
import { confirmationKey, createConfirmation } from "@/composables/useConfirm.js";
import { createToast, toastKey } from "@/composables/useToast.js";

import PlaylistPage from "./PlaylistPage.vue";

vi.mock("@/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api.js")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getPlaylist: vi.fn(),
      getVideo: vi.fn(),
      openVideo: vi.fn(),
      preparePlayback: vi.fn(),
    },
  };
});

const playlistId = "111111111111111111111111";
const videoId = "222222222222222222222222";
const video = {
  authors: ["Author"],
  completed: false,
  coverUrl: null,
  description: "",
  durationSeconds: 120,
  id: videoId,
  playlistId,
  playlistSectionId: null,
  playlistSectionTitle: null,
  playlistTitle: "Example playlist",
  positionSeconds: 0,
  progressPercent: 0,
  source: null,
  tags: ["Example"],
  title: "Example video",
};

async function mountPlaylistPage() {
  vi.mocked(api.getPlaylist).mockResolvedValue({
    authors: ["Author"],
    completedCount: 0,
    coverUrl: null,
    description: "",
    durationSeconds: 120,
    id: playlistId,
    progressPercent: 0,
    sections: [{ id: null, title: "Videos", videos: [video] }],
    source: null,
    tags: ["Example"],
    title: "Example playlist",
    videoCount: 1,
  });
  vi.mocked(api.getVideo).mockResolvedValue({
    playlist: null,
    video: { ...video, chapters: [] },
  });

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/playlists/:playlistId", name: "playlist", component: PlaylistPage },
      { path: "/videos/:videoId", name: "player", component: { template: "<div />" } },
    ],
  });
  await router.push(`/playlists/${playlistId}`);
  await router.isReady();

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = mount(PlaylistPage, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient }], router],
      provide: {
        [confirmationKey as symbol]: createConfirmation(),
        [toastKey as symbol]: createToast(),
      },
    },
  });
  await flushPromises();
  return wrapper;
}

describe("PlaylistPage", () => {
  it("prefetches the next video safely when Play is hovered", async () => {
    const wrapper = await mountPlaylistPage();

    await wrapper.get(`a[href="/videos/${videoId}"]`).trigger("pointerenter");
    await flushPromises();

    expect(api.getVideo).toHaveBeenCalledWith(videoId, expect.any(AbortSignal));
    expect(api.preparePlayback).not.toHaveBeenCalled();
    expect(api.openVideo).not.toHaveBeenCalled();
  });
});
