// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import CourseCardGrid from "./CourseCardGrid.vue";

describe("CourseCardGrid", () => {
  it("announces playlist loading as a status", () => {
    const wrapper = mount(CourseCardGrid, {
      props: { playlists: [], loading: true },
    });

    const loadingStatus = wrapper.get('[aria-label="Loading playlists"]');
    expect(loadingStatus.attributes("role")).toBe("status");
  });
});
