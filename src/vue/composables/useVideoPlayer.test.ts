// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  api,
  ApiError,
  type PlaybackResult,
  type PlaylistDetailDto,
  type VideoDetailDto,
  type VideoPlayerDetailDto,
} from "@/api.js";
import { confirmationKey, createConfirmation } from "@/composables/useConfirm.js";
import { createToast, toastKey } from "@/composables/useToast.js";
import { useVideoPlayer } from "@/composables/useVideoPlayer.js";

const playlistId = "1".repeat(24);
const videoId = "2".repeat(24);
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
  positionSeconds: 30,
  progressPercent: 25,
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
  progressPercent: 25,
  sections: [{ id: null, title: "Videos", videos: [video] }],
  source: null,
  tags: [],
  title: "Saved Collection",
  videoCount: 1,
};

afterEach(() => vi.restoreAllMocks());

interface MountPlayerOptions {
  getVideo?: (id: string, signal?: AbortSignal) => Promise<VideoPlayerDetailDto>;
  preparePlayback?: (id: string) => Promise<PlaybackResult>;
  regenerateVideoThumbnail?: (id: string) => Promise<void>;
}

async function mountPlayer(options: MountPlayerOptions & { path?: string } = {}) {
  vi.spyOn(api, "getVideo").mockImplementation(
    options.getVideo ?? (async () => ({ video: { ...video }, playlist })),
  );
  vi.spyOn(api, "preparePlayback").mockImplementation(
    options.preparePlayback ?? (async () => ({ kind: "direct" as const, url: "/media/video" })),
  );
  vi.spyOn(api, "regenerateVideoThumbnail").mockImplementation(
    options.regenerateVideoThumbnail ?? (async () => undefined),
  );
  vi.spyOn(api, "openVideo").mockResolvedValue();

  const media = {
    canPlayType: vi.fn(() => ""),
    currentTime: 30,
    duration: 120,
    load: vi.fn(),
    pause: vi.fn(),
    readyState: 1,
    removeAttribute: vi.fn(),
    src: "",
  } as unknown as HTMLVideoElement;
  const component = defineComponent({
    setup() {
      return { player: useVideoPlayer(shallowRef(media)) };
    },
    template: `
      <p data-video-title>{{ player.video.value?.title }}</p>
      <p data-playlist-id>{{ player.playlist.value?.id ?? "" }}</p>
      <button data-regenerate @click="player.regenerateThumbnail">Regenerate thumbnail</button>
      <button data-reset-video @click="player.resetProgress">Reset video</button>
      <button data-reset-playlist @click="player.resetPlaylistProgress">Reset playlist</button>
    `,
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/videos/:videoId", name: "player", component },
      { path: "/:pathMatch(.*)*", name: "not-found", component: { template: "<div />" } },
    ],
  });
  await router.push(options.path ?? `/videos/${videoId}`);
  await router.isReady();
  const confirmation = createConfirmation();
  const toast = createToast();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = mount(component, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient }], router],
      provide: { [confirmationKey as symbol]: confirmation, [toastKey as symbol]: toast },
    },
  });
  await flushPromises();
  return { confirmation, media, router, toast, wrapper };
}

describe("useVideoPlayer", () => {
  it("refreshes the current video after regenerating its thumbnails", async () => {
    let requestCount = 0;
    const { toast, wrapper } = await mountPlayer({
      getVideo: async () => {
        const initialRequest = requestCount++ === 0;
        return {
          video: {
            ...video,
            coverUrl: initialRequest ? "/covers/old" : "/covers/new",
            title: initialRequest ? "Example video" : "Updated video",
          },
          playlist,
        };
      },
    });

    await wrapper.get("[data-regenerate]").trigger("click");
    await flushPromises();

    expect(api.regenerateVideoThumbnail).toHaveBeenCalledWith(videoId);
    expect(wrapper.get("[data-video-title]").text()).toBe("Updated video");
    expect(toast.toasts.value).toContainEqual(
      expect.objectContaining({ kind: "success", message: "Thumbnail updated" }),
    );
    wrapper.unmount();
  });

  it("reports a failed video progress reset", async () => {
    vi.spyOn(api, "resetVideo").mockRejectedValue(new ApiError("Video reset failed", 500));
    const { confirmation, toast, wrapper } = await mountPlayer();

    await wrapper.get("[data-reset-video]").trigger("click");
    confirmation.accept();
    await flushPromises();

    expect(toast.toasts.value).toEqual([
      expect.objectContaining({ kind: "error", message: "Video reset failed" }),
    ]);
    wrapper.unmount();
  });

  it("reports a failed playlist progress reset", async () => {
    vi.spyOn(api, "resetPlaylist").mockRejectedValue(new ApiError("Playlist reset failed", 500));
    const { confirmation, toast, wrapper } = await mountPlayer({
      path: `/videos/${videoId}?list=${playlistId}`,
    });

    await wrapper.get("[data-reset-playlist]").trigger("click");
    confirmation.accept();
    await flushPromises();

    expect(toast.toasts.value).toEqual([
      expect.objectContaining({ kind: "error", message: "Playlist reset failed" }),
    ]);
    wrapper.unmount();
  });

  it("shows playlist context only when the list query matches", async () => {
    const { router, wrapper } = await mountPlayer();

    expect(wrapper.get("[data-playlist-id]").text()).toBe("");

    await router.replace({ query: { list: playlistId } });
    await flushPromises();

    expect(wrapper.get("[data-playlist-id]").text()).toBe(playlistId);
    expect(api.getVideo).toHaveBeenCalledTimes(1);

    await router.replace({ query: { list: "9".repeat(24) } });
    await flushPromises();

    expect(wrapper.get("[data-playlist-id]").text()).toBe("");
    expect(api.getVideo).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("keeps the latest video when the same route changes", async () => {
    const nextVideoId = "3".repeat(24);
    const nextVideo: VideoDetailDto = {
      ...video,
      id: nextVideoId,
      playlistId: null,
      playlistTitle: null,
      title: "Next video",
    };
    let resolveInitialVideo!: (detail: VideoPlayerDetailDto) => void;
    const initialVideo = new Promise<VideoPlayerDetailDto>((resolve) => {
      resolveInitialVideo = resolve;
    });
    const getVideo = vi.fn(async (id: string) => {
      if (id === videoId) return initialVideo;
      return { video: nextVideo, playlist: null };
    });
    const preparePlayback = vi.fn(async (id: string): Promise<PlaybackResult> => ({
      kind: "direct",
      url: `/media/${id}`,
    }));
    const { media, router, wrapper } = await mountPlayer({ getVideo, preparePlayback });

    await vi.waitFor(() => expect(getVideo).toHaveBeenCalledWith(videoId, expect.any(AbortSignal)));
    await router.push(`/videos/${nextVideoId}`);
    await vi.waitFor(() => expect(wrapper.get("[data-video-title]").text()).toBe("Next video"));

    resolveInitialVideo({ video: { ...video, title: "First video" }, playlist });
    await flushPromises();

    expect(wrapper.get("[data-video-title]").text()).toBe("Next video");
    expect(media.src).toBe(`/media/${nextVideoId}`);
    expect(api.openVideo).toHaveBeenCalledTimes(1);
    expect(api.openVideo).toHaveBeenCalledWith(nextVideoId);
    wrapper.unmount();
  });
});
