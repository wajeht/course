// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, type LibraryDto } from "@/api.js";

import VideoSearchPalette from "./VideoSearchPalette.vue";

const videoId = "2".repeat(24);

function dialogElement<T extends Element>(selector: string): DOMWrapper<T> {
  const element = document.body.querySelector<T>(selector);
  if (!element) throw new Error(`Missing dialog element: ${selector}`);
  return new DOMWrapper(element);
}

function library(): LibraryDto {
  return {
    authors: [],
    continueWatching: [],
    pagination: { page: 1, pageSize: 20, totalPages: 1, totalVideos: 1 },
    playlists: [],
    tags: [],
    videos: [
      {
        authors: ["Example Author"],
        completed: false,
        coverUrl: null,
        description: "",
        durationSeconds: 120,
        id: videoId,
        playlistId: "3".repeat(24),
        playlistSectionId: null,
        playlistSectionTitle: null,
        playlistTitle: "Example Playlist",
        positionSeconds: 0,
        progressPercent: 0,
        source: null,
        tags: [],
        title: "Memory optimization",
      },
    ],
  };
}

async function mountPalette() {
  vi.spyOn(api, "getLibrary").mockResolvedValue(library());
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: { template: "<div />" } },
      { path: "/videos", name: "videos", component: { template: "<div />" } },
      { path: "/videos/:videoId", name: "player", component: { template: "<div />" } },
    ],
  });
  await router.push("/");
  await router.isReady();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = mount(VideoSearchPalette, {
    attachTo: document.body,
    global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
  });
  return { router, wrapper };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("VideoSearchPalette", () => {
  it("opens with Command K and shows matching video titles", async () => {
    await mountPalette();

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true, cancelable: true }),
    );
    await flushPromises();
    expect(document.body.querySelector("dialog[open]")).toBeTruthy();

    await dialogElement<HTMLInputElement>('input[aria-label="Search video titles"]').setValue(
      "memory",
    );

    await vi.waitFor(() => expect(document.body.textContent).toContain("Memory optimization"));
    expect(document.body.textContent).toContain("Example Author");
    expect(document.body.textContent).toContain("Example Playlist");
    expect(api.getLibrary).toHaveBeenCalledWith(
      { page: 1, pageSize: 20, query: "memory" },
      expect.any(AbortSignal),
    );
  });

  it("sends an unselected query to the Videos page", async () => {
    const { router, wrapper } = await mountPalette();
    await wrapper.get('button[aria-label="Search videos"]').trigger("click");
    await dialogElement<HTMLInputElement>('input[aria-label="Search video titles"]').setValue(
      "memory optimization",
    );

    await dialogElement<HTMLFormElement>("dialog form").trigger("submit");
    await flushPromises();

    expect(router.currentRoute.value).toMatchObject({
      name: "videos",
      query: { q: "memory optimization" },
    });
  });

  it("opens a selected video with the keyboard", async () => {
    const { router, wrapper } = await mountPalette();
    await wrapper.get('button[aria-label="Search videos"]').trigger("click");
    const input = dialogElement<HTMLInputElement>('input[aria-label="Search video titles"]');
    await input.setValue("memory");
    await vi.waitFor(() => expect(document.body.textContent).toContain("Memory optimization"));

    await input.trigger("keydown", { key: "ArrowDown" });
    const selected = dialogElement<HTMLElement>('[role="option"][aria-selected="true"]');
    expect(selected.classes()).toContain("bg-pine");
    expect(selected.classes()).toContain("border-belt");
    await dialogElement<HTMLFormElement>("dialog form").trigger("submit");
    await flushPromises();

    expect(router.currentRoute.value).toMatchObject({
      name: "player",
      params: { videoId },
    });
  });
});
