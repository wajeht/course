<script setup lang="ts">
import { computed, watch } from "vue";

import type { CourseDetailDto } from "@/api.js";
import LessonRow from "@/components/LessonRow.vue";
import AppButton from "@/components/ui/AppButton.vue";
import { useExpandableSections } from "@/composables/useExpandableSections.js";

const props = defineProps<{
  activeLessonId?: string;
  playlist: CourseDetailDto | null;
  open: boolean;
}>();
const emit = defineEmits<{ close: [] }>();
const { expandSection, isSectionExpanded, replaceExpandedSections, sectionPanelId, toggleSection } =
  useExpandableSections("sidebar-section");
const allLessons = computed(
  () => props.playlist?.sections.flatMap((section) => section.videos) ?? [],
);
const currentIndex = computed(() =>
  allLessons.value.findIndex((video) => video.id === props.activeLessonId),
);
let previousCourseId: string | undefined;

watch(
  [() => props.playlist, () => props.activeLessonId],
  ([playlist, activeLessonId]) => {
    if (!playlist) return;
    const activeSection = playlist.sections.find((section) =>
      section.videos.some((video) => video.id === activeLessonId),
    );
    if (!activeSection) return;
    if (previousCourseId === playlist.id) expandSection(activeSection);
    else replaceExpandedSections([activeSection]);
    previousCourseId = playlist.id;
  },
  { immediate: true },
);
</script>

<template>
  <aside
    v-if="playlist"
    class="sticky top-0 flex h-[calc(100vh-66px)] flex-col border-l border-[#2d3732] bg-[#f8f9f6] max-[860px]:fixed max-[860px]:inset-y-0 max-[860px]:right-0 max-[860px]:z-[70] max-[860px]:h-dvh max-[860px]:w-[min(390px,92vw)] max-[860px]:border-l-0 max-[860px]:shadow-[-20px_0_60px_rgb(0_0_0_/_35%)] max-[860px]:transition-transform max-[860px]:duration-[220ms]"
    :class="open ? 'max-[860px]:translate-x-0' : 'max-[860px]:translate-x-[105%]'"
  >
    <div
      class="flex items-center justify-between border-b border-line px-[22px] pt-[22px] pb-[18px] max-[860px]:pt-[calc(22px+env(safe-area-inset-top))]"
    >
      <div>
        <p class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
          Curriculum
        </p>
        <h2 class="font-mono text-[.92rem] font-semibold">
          Video {{ currentIndex + 1 }} of {{ allLessons.length }}
        </h2>
      </div>
      <AppButton
        class="hidden h-9 w-9 place-items-center rounded-full border border-line bg-white text-[1.4rem] text-ink max-[860px]:grid"
        variant="unstyled"
        aria-label="Close videos"
        @click="emit('close')"
      >
        ×
      </AppButton>
    </div>
    <div class="flex-1 overflow-y-auto overscroll-contain">
      <section v-for="section in playlist.sections" :key="section.id ?? 'direct'">
        <h3
          class="sticky top-0 z-[2] border-y border-pine/15 bg-mist font-display text-[.78rem] font-extrabold tracking-[.08em] text-pine-deep uppercase shadow-[inset_4px_0_0_#c4933f]"
        >
          <AppButton
            class="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-belt"
            variant="unstyled"
            :aria-expanded="isSectionExpanded(section)"
            :aria-controls="sectionPanelId(section)"
            @click="toggleSection(section)"
          >
            <span>{{ section.title }}</span>
            <span
              class="grid h-7 w-7 flex-none place-items-center rounded-full border border-pine/20 bg-white/45 text-pine"
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
          </AppButton>
        </h3>
        <div v-show="isSectionExpanded(section)" :id="sectionPanelId(section)">
          <LessonRow
            v-for="(video, index) in section.videos"
            :key="video.id"
            :video
            :index
            :active="video.id === activeLessonId"
            sidebar
          />
        </div>
      </section>
    </div>
  </aside>
</template>
