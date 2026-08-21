// @vitest-environment happy-dom

import { VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";

import { api, type LessonPlayerDetailDto } from "@/api.js";
import { createCourseQueryClient } from "@/queries.js";
import LessonRow from "./LessonRow.vue";

const courseId = "a".repeat(24);
const lessonId = "b".repeat(24);
const lesson = {
  id: lessonId,
  courseId,
  courseTitle: "Course",
  courseCoverUrl: null,
  sectionId: null,
  sectionTitle: null,
  title: "Lesson",
  durationSeconds: 600,
  positionSeconds: 0,
  completed: false,
  progressPercent: 0,
};
const detail: LessonPlayerDetailDto = {
  lesson: { ...lesson, chapters: [] },
  course: {
    id: courseId,
    title: "Course",
    description: "",
    category: "Uncategorized",
    instructors: [],
    tags: [],
    coverUrl: null,
    lessonCount: 1,
    completedCount: 0,
    progressPercent: 0,
    durationSeconds: 600,
    sections: [{ id: null, title: "Lessons", lessons: [lesson] }],
  },
};

describe("LessonRow", () => {
  it("prefetches safe lesson data immediately on hover without preparing playback", async () => {
    const getLesson = vi.spyOn(api, "getLesson").mockResolvedValue(detail);
    const preparePlayback = vi.spyOn(api, "preparePlayback");
    const openLesson = vi.spyOn(api, "openLesson");
    const queryClient = createCourseQueryClient();
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        {
          path: "/lessons/:lessonId",
          name: "player",
          component: { template: "<div />" },
        },
      ],
    });
    await router.push("/");
    await router.isReady();
    const wrapper = mount(LessonRow, {
      props: { lesson, index: 0 },
      global: { plugins: [[VueQueryPlugin, { queryClient }], router] },
    });

    await wrapper.get("a").trigger("pointerenter");
    await flushPromises();

    expect(getLesson).toHaveBeenCalledOnce();
    expect(getLesson).toHaveBeenCalledWith(lessonId, expect.any(AbortSignal));
    expect(preparePlayback).not.toHaveBeenCalled();
    expect(openLesson).not.toHaveBeenCalled();

    wrapper.unmount();
    queryClient.clear();
  });
});
