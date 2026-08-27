// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ChapterList from "./ChapterList.vue";

const chapters = [
  { title: "Introduction", startSeconds: 0, thumbnailUrl: null },
  { title: "Escapes Overview", startSeconds: 416, thumbnailUrl: "/covers/videos/a/chapters/416" },
  { title: "General Reflections", startSeconds: 2_617, thumbnailUrl: null },
];

describe("ChapterList", () => {
  it("formats timestamps and marks the current chapter", () => {
    const wrapper = mount(ChapterList, { props: { chapters, currentTime: 500 } });
    const buttons = wrapper.findAll("button");

    expect(wrapper.text()).toContain("6:56");
    expect(buttons[1]?.attributes("aria-current")).toBe("true");
  });

  it("does not mark a future chapter as current", () => {
    const wrapper = mount(ChapterList, {
      props: { chapters: chapters.slice(1), currentTime: 100 },
    });

    expect(wrapper.findAll("button").every((button) => !button.attributes("aria-current"))).toBe(
      true,
    );
  });

  it("emits the selected chapter time", async () => {
    const wrapper = mount(ChapterList, { props: { chapters, currentTime: 0 } });

    await wrapper.findAll("button")[2]?.trigger("click");

    expect(wrapper.emitted("seek")).toEqual([[2_617]]);
  });

  it("renders a chapter thumbnail when present", () => {
    const wrapper = mount(ChapterList, { props: { chapters, currentTime: 0 } });
    const image = wrapper.get("img");

    expect(image.attributes("src")).toBe("/covers/videos/a/chapters/416");
  });
});
