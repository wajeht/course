<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { api, apiErrorMessage, isCatalogResourceNotFound } from "@/api.js";
import CourseCurriculum from "@/pages/course/partials/CourseCurriculum.vue";
import CourseHero from "@/pages/course/partials/CourseHero.vue";
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import AppButton from "@/components/ui/AppButton.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useConfirm } from "@/composables/useConfirm.js";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";
import { useToast } from "@/composables/useToast.js";
import { courseQueryOptions, queryKeys } from "@/queries.js";
import { notFoundLocation } from "@/router.js";
import { setPageTitle } from "@/utils.js";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const prefetch = useRoutePrefetch();
const courseId = computed(() => String(route.params.courseId));
const courseRequest = useQuery(computed(() => courseQueryOptions(courseId.value)));
const confirmation = useConfirm();
const toast = useToast();
const course = computed(() => courseRequest.data.value);
const loading = computed(() => courseRequest.isPending.value);
const allLessons = computed(
  () => course.value?.sections.flatMap((section) => section.lessons) ?? [],
);
const hasStarted = computed(() =>
  allLessons.value.some((lesson) => lesson.completed || lesson.positionSeconds > 0),
);
const nextLesson = computed(
  () => allLessons.value.find((lesson) => !lesson.completed) ?? allLessons.value.at(0),
);

const resetAction = useAsyncAction(
  async (id: string) => {
    await api.resetCourse(id);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.catalog }),
      queryClient.invalidateQueries({ queryKey: queryKeys.course(id) }),
    ]);
  },
  {
    errorMessage: "Could not reset course progress",
    onSuccess: () => {
      toast.success("Course progress reset");
    },
  },
);
const error = computed(() => {
  if (resetAction.errorMessage.value) return resetAction.errorMessage.value;
  const caught = courseRequest.error.value;
  return caught ? apiErrorMessage(caught, "Could not load this course") : "";
});

async function resetProgress(): Promise<void> {
  if (!course.value) return;
  const targetCourseId = course.value.id;
  const confirmed = await confirmation.confirm({
    title: "Reset course progress?",
    message: "This resets every lesson in this course and cannot be undone.",
    confirmLabel: "Reset progress",
    variant: "danger",
  });
  if (!confirmed || course.value?.id !== targetCourseId) return;
  await resetAction.run(targetCourseId);
}

watch(
  [courseId, courseRequest.error],
  ([id, caught]) => {
    if (courseId.value === id && isCatalogResourceNotFound(caught)) {
      void router.replace(notFoundLocation(route.path));
    }
  },
  { immediate: true },
);
watch(
  courseRequest.data,
  (loadedCourse) => {
    if (loadedCourse) setPageTitle(loadedCourse.title);
  },
  { immediate: true },
);
</script>

<template>
  <main v-if="course">
    <CourseHero
      :course
      :has-started="hasStarted"
      :next-lesson="nextLesson"
      :resetting="resetAction.pending.value"
      @reset="resetProgress"
    />
    <CourseCurriculum :course />
  </main>

  <main
    v-else
    class="mx-auto grid min-h-[calc(100vh-66px)] w-[min(1380px,calc(100%-8vw))] place-items-center max-[860px]:w-[min(100%-40px,1380px)]"
  >
    <div
      v-if="loading"
      class="h-[42px] w-[42px] animate-spin rounded-full border-[3px] border-mist border-t-belt"
      aria-label="Loading course"
      role="status"
    />
    <EmptyState
      v-else
      title="Course unavailable"
      :description="error"
      :heading-level="1"
      :framed="false"
    >
      <template #actions>
        <AppButton :as="IntentRouterLink" to="/library" :prefetch="prefetch.library" size="lg">
          Back to library
        </AppButton>
      </template>
    </EmptyState>
  </main>
</template>
