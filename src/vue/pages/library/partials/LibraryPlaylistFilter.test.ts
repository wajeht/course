// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import LibraryPlaylistFilter from "./LibraryPlaylistFilter.vue";

describe("LibraryPlaylistFilter", () => {
  it("switches between videos and playlists", async () => {
    const wrapper = mount(LibraryPlaylistFilter, {
      props: { modelValue: "videos" },
    });

    expect(wrapper.text()).toContain("All videos");
    expect(wrapper.text()).toContain("Playlists");
    expect(wrapper.get<HTMLInputElement>('input[value="videos"]').element.checked).toBe(true);

    await wrapper.find('input[value="playlists"]').setValue();

    expect(wrapper.emitted("update:modelValue")).toEqual([["playlists"]]);
  });

  it("emits immediate prefetch intent for the hovered view", async () => {
    const wrapper = mount(LibraryPlaylistFilter, {
      props: { modelValue: "videos" },
    });

    await wrapper
      .get('input[value="playlists"]')
      .element.closest("label")!
      .dispatchEvent(new PointerEvent("pointerenter"));

    expect(wrapper.emitted("prefetch")).toEqual([["playlists"]]);
  });
});
