// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ChapterList from "./ChapterList.vue";

const chapters = [
  { title: "Introduction", startSeconds: 0 },
  { title: "Escapes Overview", startSeconds: 416 },
  { title: "General Reflections", startSeconds: 2_617 },
];

describe("ChapterList", () => {
  it("formats timestamps and marks the current chapter", () => {
    const wrapper = mount(ChapterList, { props: { chapters, currentTime: 500 } });
    const buttons = wrapper.findAll("button");

    expect(wrapper.text()).toContain("6:56");
    expect(buttons[1]?.attributes("aria-current")).toBe("true");
  });

  it("emits the selected chapter time", async () => {
    const wrapper = mount(ChapterList, { props: { chapters, currentTime: 0 } });

    await wrapper.findAll("button")[2]?.trigger("click");

    expect(wrapper.emitted("seek")).toEqual([[2_617]]);
  });
});
