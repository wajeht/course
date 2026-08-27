// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

import type { LibraryDto } from "@/api.js";

import ContinueWatchingSection from "./ContinueWatchingSection.vue";

function video(id: string, title: string): LibraryDto["continueWatching"][number] {
  return {
    authors: [],
    completed: false,
    coverUrl: null,
    description: "",
    durationSeconds: 90,
    id,
    playlistId: null,
    playlistSectionId: null,
    playlistSectionTitle: null,
    playlistTitle: null,
    positionSeconds: 45,
    progressPercent: 50,
    source: null,
    tags: [],
    title,
  };
}

function mountSection(props: { videos: LibraryDto["continueWatching"]; loading: boolean }) {
  const queryClient = new QueryClient();
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/videos", component: { template: "<div />" } },
      { path: "/videos/:videoId", name: "player", component: { template: "<div />" } },
    ],
  });
  return mount(ContinueWatchingSection, {
    props,
    global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
  });
}

describe("ContinueWatchingSection", () => {
  it("announces video loading accurately", () => {
    const wrapper = mountSection({ videos: [], loading: true });

    expect(wrapper.get('[aria-label="Loading videos"]').attributes("aria-label")).toBe(
      "Loading videos",
    );
    expect(wrapper.get('[aria-label="Loading videos"]').attributes("role")).toBe("status");
  });

  it("promotes the first video and keeps the remaining videos in the queue", () => {
    const wrapper = mountSection({
      videos: [video("one", "Featured video"), video("two", "Queued video")],
      loading: false,
    });

    expect(wrapper.get('a[aria-label="Continue Featured video"]')).toBeTruthy();
    expect(wrapper.get("#up-next-title").text()).toBe("Up next");
    expect(wrapper.text()).toContain("Queued video");
  });
});
