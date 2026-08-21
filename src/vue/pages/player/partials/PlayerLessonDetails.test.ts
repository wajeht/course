// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import type { LessonDetailDto } from "@/api.js";
import PlayerLessonDetails from "./PlayerLessonDetails.vue";

const lesson: LessonDetailDto = {
  id: "lesson-1",
  courseId: "course-1",
  courseTitle: "Course",
  courseCoverUrl: null,
  sectionId: null,
  sectionTitle: null,
  title: "Introduction",
  durationSeconds: 600,
  positionSeconds: 0,
  completed: false,
  progressPercent: 0,
  chapters: [{ title: "Overview", startSeconds: 0 }],
};

describe("PlayerLessonDetails", () => {
  it("describes chapters in course-neutral language with a complete count", () => {
    const wrapper = mount(PlayerLessonDetails, {
      props: { currentTime: 0, lesson, resetting: false },
    });

    expect(wrapper.text()).toContain("Lesson outline");
    expect(wrapper.text()).toContain("1 chapter");
    expect(wrapper.text()).not.toContain("Technique index");
    expect(wrapper.text()).not.toContain("1 total");
  });
});
