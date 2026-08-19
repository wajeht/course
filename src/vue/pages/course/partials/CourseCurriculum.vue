<script setup lang="ts">
import { watch } from "vue";

import type { CourseDetailDto } from "@/api.js";
import LessonRow from "@/components/LessonRow.vue";
import AppButton from "@/components/ui/AppButton.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import PanelCard from "@/components/ui/PanelCard.vue";
import { useExpandableSections } from "@/composables/useExpandableSections.js";
import { countText } from "@/utils.js";

const props = defineProps<{ course: CourseDetailDto }>();
const { isSectionExpanded, replaceExpandedSections, sectionPanelId, toggleSection } =
  useExpandableSections("course-section");

watch(
  () => props.course,
  (course) => {
    const lessons = course.sections.flatMap((section) => section.lessons);
    const startingLesson = lessons.find((lesson) => !lesson.completed) ?? lessons.at(0);
    const startingSection = course.sections.find((section) =>
      section.lessons.some((lesson) => lesson.id === startingLesson?.id),
    );
    replaceExpandedSections(startingSection ? [startingSection] : []);
  },
  { immediate: true },
);
</script>

<template>
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
      <header class="border-b border-pine/15 bg-mist text-pine-deep shadow-[inset_4px_0_0_#c4933f]">
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
</template>
