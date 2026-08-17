<script setup lang="ts">
import { computed, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { api } from "@/api.js";
import CourseCoverPlaceholder from "@/components/CourseCoverPlaceholder.vue";
import LessonRow from "@/components/LessonRow.vue";
import AppButton from "@/components/ui/AppButton.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import PanelCard from "@/components/ui/PanelCard.vue";
import ProgressBar from "@/components/ui/ProgressBar.vue";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useAsyncData } from "@/composables/useAsyncData.js";
import { useConfirm } from "@/composables/useConfirm.js";
import { useExpandableSections } from "@/composables/useExpandableSections.js";
import { useToast } from "@/composables/useToast.js";
import { countText, durationText, setPageTitle } from "@/utils.js";

const route = useRoute();
const courseId = computed(() => String(route.params.courseId));
const courseRequest = useAsyncData(({ signal }) => api.getCourse(courseId.value, signal), {
  immediate: false,
});
const confirmation = useConfirm();
const toast = useToast();
const course = computed(() => courseRequest.data.value);
const loading = computed(() => courseRequest.loading.value && course.value === null);
const resetAction = useAsyncAction(
  async (id: string) => {
    await api.resetCourse(id);
    await courseRequest.refresh();
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
  return caught instanceof Error ? caught.message : caught ? "Could not load this course" : "";
});
const { isSectionExpanded, replaceExpandedSections, sectionPanelId, toggleSection } =
  useExpandableSections("course-section");

const allLessons = computed(
  () => course.value?.sections.flatMap((section) => section.lessons) ?? [],
);
const hasStarted = computed(() =>
  allLessons.value.some((lesson) => lesson.completed || lesson.positionSeconds > 0),
);
const nextLesson = computed(
  () => allLessons.value.find((lesson) => !lesson.completed) ?? allLessons.value.at(0),
);

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
  courseId,
  () => {
    courseRequest.data.value = null;
    void courseRequest.refresh().catch(() => undefined);
  },
  { immediate: true },
);
watch(
  courseRequest.data,
  (loadedCourse) => {
    if (!loadedCourse) return;
    setPageTitle(loadedCourse.title);
    const loadedLessons = loadedCourse.sections.flatMap((section) => section.lessons);
    const startingLesson = loadedLessons.find((lesson) => !lesson.completed) ?? loadedLessons.at(0);
    const startingSection = loadedCourse.sections.find((section) =>
      section.lessons.some((lesson) => lesson.id === startingLesson?.id),
    );
    replaceExpandedSections(startingSection ? [startingSection] : []);
  },
  { immediate: true },
);
</script>

<template>
  <main v-if="course">
    <section
      class="grid grid-cols-[minmax(260px,390px)_minmax(0,1fr)] gap-[clamp(36px,6vw,92px)] bg-pine-deep bg-[radial-gradient(circle_at_83%_20%,rgb(196_147_63_/_16%),transparent_30%),repeating-linear-gradient(90deg,transparent_0_52px,rgb(255_255_255_/_2%)_52px_53px)] px-[max(4vw,calc((100vw-1380px)/2))] py-[clamp(52px,7vw,90px)] text-white max-[860px]:grid-cols-[minmax(180px,260px)_minmax(0,1fr)] max-[860px]:gap-[34px] max-[600px]:grid-cols-1 max-[600px]:gap-5 max-[600px]:px-5 max-[600px]:pt-10 max-[600px]:pb-12"
    >
      <div
        class="aspect-[4/5] self-center overflow-hidden rounded-[10px] border border-white/18 bg-pine shadow-[0_28px_70px_rgb(0_0_0_/_32%)] max-[600px]:w-full max-[600px]:self-start"
      >
        <img
          v-if="course.coverUrl"
          class="h-full w-full object-cover"
          :src="course.coverUrl"
          :alt="`${course.title} cover`"
        />
        <CourseCoverPlaceholder v-else class="h-full w-full" :title="course.title" />
      </div>
      <div class="max-w-[800px] self-center">
        <p class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
          <template v-if="course.category !== 'Uncategorized'">{{ course.category }} · </template>
          {{ countText(course.lessonCount, "lesson") }} · {{ durationText(course.durationSeconds) }}
        </p>
        <h1
          class="mb-[23px] max-w-[880px] font-display text-[clamp(2.7rem,5.2vw,5.8rem)] leading-[.95] font-extrabold tracking-[-.05em] max-[860px]:text-[clamp(2.3rem,6.4vw,4rem)] max-[600px]:text-[clamp(1.8rem,8vw,2.7rem)]"
        >
          {{ course.title }}
        </h1>
        <p
          v-if="course.instructors.length"
          class="-mt-3 mb-4 text-[.78rem] font-bold tracking-[.04em] text-belt-light"
        >
          Taught by
          <template v-for="(instructor, index) in course.instructors" :key="instructor">
            <span v-if="index" aria-hidden="true">, </span>
            <RouterLink
              :to="{ name: 'instructor', params: { instructorName: instructor } }"
              class="underline decoration-belt-light/35 underline-offset-4 hover:decoration-belt-light"
            >
              {{ instructor }}
            </RouterLink>
          </template>
        </p>
        <p
          class="max-w-[700px] text-[clamp(.95rem,1.4vw,1.12rem)] leading-[1.65] text-white/72 max-[600px]:col-span-full max-[600px]:text-[.86rem]"
          :class="course.tags.length ? 'mb-5' : 'mb-[34px]'"
        >
          {{ course.description || "Your course, ready whenever you are." }}
        </p>
        <div
          v-if="course.tags.length"
          class="mb-[30px] flex max-w-[700px] flex-wrap gap-2 max-[600px]:col-span-full"
          aria-label="Course topics"
        >
          <span
            v-for="tag in course.tags"
            :key="tag"
            class="rounded-full border border-white/20 bg-white/8 px-3 py-1 text-[.68rem] font-semibold text-white/78"
          >
            {{ tag }}
          </span>
        </div>
        <div v-if="hasStarted" class="mb-[30px] max-w-[620px] max-[600px]:col-span-full">
          <div class="mb-[10px] flex justify-between text-[.74rem] font-[650] text-white/68">
            <span>Course progress</span
            ><strong class="text-white">{{ course.progressPercent }}%</strong>
          </div>
          <ProgressBar :value="course.progressPercent" light />
        </div>
        <div class="flex flex-wrap gap-[10px] max-[600px]:col-span-full">
          <AppButton
            v-if="nextLesson"
            :as="RouterLink"
            :to="{ name: 'player', params: { lessonId: nextLesson.id } }"
            variant="accent"
            size="lg"
          >
            <span aria-hidden="true">▶</span>
            {{ nextLesson.positionSeconds ? "Resume course" : "Start course" }}
          </AppButton>
          <AppButton
            v-if="hasStarted"
            variant="outline-inverse"
            size="lg"
            :loading="resetAction.pending.value"
            loading-label="Resetting…"
            @click="resetProgress"
          >
            Reset progress
          </AppButton>
        </div>
      </div>
    </section>

    <section
      class="mx-auto w-[min(1380px,calc(100%-8vw))] pt-[clamp(52px,7vw,90px)] pb-[100px] max-[860px]:w-[min(100%-40px,1380px)]"
    >
      <PageHeader
        class="mb-6"
        eyebrow="Structured learning"
        title="Course curriculum"
        :heading-level="2"
      >
        <template #aside>
          <span class="text-[.78rem] font-semibold text-muted">
            {{ course.completedCount }} of {{ course.lessonCount }} completed
          </span>
        </template>
      </PageHeader>
      <PanelCard
        v-for="section in course.sections"
        :key="section.id ?? 'direct'"
        as="article"
        class="mb-5 shadow-[0_6px_22px_rgb(24_32_29_/_4%)]"
        padding="none"
      >
        <header
          class="border-b border-pine/15 bg-mist text-pine-deep shadow-[inset_4px_0_0_#c4933f]"
        >
          <h3>
            <AppButton
              class="flex w-full cursor-pointer items-center justify-between gap-4 px-[22px] py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-belt"
              variant="unstyled"
              :aria-expanded="isSectionExpanded(section)"
              :aria-controls="sectionPanelId(section)"
              @click="toggleSection(section)"
            >
              <span class="font-display text-[1.12rem] font-extrabold tracking-[.05em] uppercase">
                {{ section.title }}
              </span>
              <span class="flex flex-none items-center gap-2.5">
                <span
                  class="rounded-full border border-pine/15 bg-pine/10 px-2.5 py-1 text-[.66rem] font-bold tracking-[.06em] text-pine-deep uppercase"
                >
                  {{ countText(section.lessons.length, "lesson") }}
                </span>
                <span
                  class="grid h-8 w-8 place-items-center rounded-full border border-pine/20 bg-white/55 text-pine"
                  aria-hidden="true"
                >
                  <svg
                    class="w-3 fill-none stroke-current stroke-2 transition-transform duration-200 motion-reduce:transition-none"
                    :class="isSectionExpanded(section) ? 'rotate-180' : ''"
                    viewBox="0 0 12 8"
                  >
                    <path d="m1 1 5 5 5-5" />
                  </svg>
                </span>
              </span>
            </AppButton>
          </h3>
        </header>
        <div v-show="isSectionExpanded(section)" :id="sectionPanelId(section)">
          <LessonRow
            v-for="(lesson, index) in section.lessons"
            :key="lesson.id"
            :lesson="lesson"
            :index="index"
          />
        </div>
      </PanelCard>
    </section>
  </main>

  <main
    v-else
    class="mx-auto grid min-h-[calc(100vh-66px)] w-[min(1380px,calc(100%-8vw))] place-items-center max-[860px]:w-[min(100%-40px,1380px)]"
  >
    <div
      v-if="loading"
      class="h-[42px] w-[42px] animate-spin rounded-full border-[3px] border-mist border-t-belt"
      aria-label="Loading"
    />
    <EmptyState v-else title="Course unavailable" :description="error" :heading-level="1">
      <template #actions>
        <AppButton :as="RouterLink" to="/library" size="lg">Back to library</AppButton>
      </template>
    </EmptyState>
  </main>
</template>
