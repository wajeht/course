// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import type { VideoDetailDto } from "@/api.js";

import PlayerVideoDetails from "./PlayerVideoDetails.vue";

const videoId = "1".repeat(24);
const video: VideoDetailDto = {
  authors: [],
  chapters: [],
  completed: false,
  coverUrl: null,
  description: "",
  durationSeconds: 120,
  id: videoId,
  playlistId: null,
  playlistSectionId: null,
  playlistSectionTitle: null,
  playlistTitle: null,
  positionSeconds: 0,
  progressPercent: 0,
  source: null,
  tags: [],
  title: "Example video",
};
describe("PlayerVideoDetails", () => {
  it("expands the mobile video details preview", async () => {
    const wrapper = mount(PlayerVideoDetails, {
      props: {
        currentTime: 0,
        resetting: false,
        video: {
          ...video,
          chapters: [
            { startSeconds: 0, title: "Introduction" },
            { startSeconds: 90, title: "Memory" },
            { startSeconds: 180, title: "Pointers" },
            { startSeconds: 270, title: "Summary" },
          ],
          description: "A complete introduction to programming and computer memory.",
        },
      },
    });

    const toggle = wrapper.get('[aria-label="Expand video details"]');
    const detailsId = toggle.attributes("aria-controls");

    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(wrapper.get(`#${detailsId}`).find('[aria-label="Video chapters"]').exists()).toBe(true);

    await toggle.trigger("click");

    expect(wrapper.get('[aria-label="Collapse video details"]').attributes("aria-expanded")).toBe(
      "true",
    );
  });

  it("places the author directly after the video title", () => {
    const wrapper = mount(PlayerVideoDetails, {
      props: {
        currentTime: 0,
        resetting: false,
        video: { ...video, authors: ["Example Author"], playlistSectionTitle: "Volume 1" },
      },
      global: {
        stubs: {
          AuthorLinks: {
            props: ["authors"],
            template: '<p>{{ authors.join(", ") }}</p>',
          },
        },
      },
    });

    const markup = wrapper.html();

    expect(markup.indexOf("Example video")).toBeLessThan(markup.indexOf("Example Author"));
    expect(wrapper.text()).not.toContain("Volume 1");
  });

  it("emits reset from the video actions menu", async () => {
    const wrapper = mount(PlayerVideoDetails, {
      props: { currentTime: 0, resetting: false, video },
    });

    await wrapper.get('[aria-label="Video actions"]').trigger("click");
    await wrapper.get('[role="menuitem"]').trigger("click");

    expect(wrapper.emitted("reset")).toHaveLength(1);
  });
});
