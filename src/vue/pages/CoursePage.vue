<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { api, type CourseDetailDto } from "../api";
import LessonRow from "../components/LessonRow.vue";
import ProgressBar from "../components/ProgressBar.vue";
import { durationText } from "../utils/format";

const route = useRoute();
const course = ref<CourseDetailDto | null>(null);
const loading = ref(true);
const resetting = ref(false);
const error = ref("");

const allLessons = computed(
  () => course.value?.sections.flatMap((section) => section.lessons) ?? [],
);
const nextLesson = computed(
  () => allLessons.value.find((lesson) => !lesson.completed) ?? allLessons.value.at(0),
);

async function loadCourse(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    course.value = await api.getCourse(String(route.params.courseId));
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Could not load this course";
  } finally {
    loading.value = false;
  }
}

async function resetProgress(): Promise<void> {
  if (!course.value || !window.confirm("Reset all lesson progress for this course?")) return;
  resetting.value = true;
  try {
    await api.resetCourse(course.value.id);
    await loadCourse();
  } finally {
    resetting.value = false;
  }
}

watch(
  () => route.params.courseId,
  () => void loadCourse(),
  { immediate: true },
);
</script>

<template>
  <main v-if="course">
    <section
      class="grid grid-cols-[minmax(260px,390px)_minmax(0,1fr)] gap-[clamp(36px,6vw,92px)] bg-pine-deep bg-[radial-gradient(circle_at_83%_20%,rgb(196_147_63_/_16%),transparent_30%),repeating-linear-gradient(90deg,transparent_0_52px,rgb(255_255_255_/_2%)_52px_53px)] px-[max(4vw,calc((100vw-1380px)/2))] py-[clamp(52px,7vw,90px)] text-white max-[860px]:grid-cols-[minmax(180px,260px)_minmax(0,1fr)] max-[860px]:gap-[34px] max-[600px]:grid-cols-[105px_minmax(0,1fr)] max-[600px]:gap-5 max-[600px]:px-5 max-[600px]:pt-10 max-[600px]:pb-12"
    >
      <div
        class="aspect-[4/5] self-center overflow-hidden rounded-[10px] border border-white/18 bg-pine shadow-[0_28px_70px_rgb(0_0_0_/_32%)] max-[600px]:self-start"
      >
        <img
          v-if="course.coverUrl"
          class="h-full w-full object-cover"
          :src="course.coverUrl"
          :alt="`${course.title} cover`"
        />
        <div
          v-else
          class="grid h-full w-full place-items-center bg-pine bg-[linear-gradient(135deg,transparent_49%,rgb(255_255_255_/_12%)_50%,transparent_51%)] bg-[length:30px_30px] font-display text-[2rem] font-black tracking-[.12em] text-white/65"
        >
          COURSE
        </div>
      </div>
      <div class="max-w-[800px] self-center max-[600px]:contents">
        <RouterLink
          to="/"
          class="mb-[42px] inline-block text-[.78rem] font-bold text-white/68 hover:text-white max-[860px]:mb-[25px] max-[600px]:col-span-full max-[600px]:mb-0"
        >
          ← Library
        </RouterLink>
        <p
          class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase max-[600px]:mb-[55px] max-[600px]:self-end"
        >
          {{ course.lessonCount }} lessons · {{ durationText(course.durationSeconds) }}
        </p>
        <h1
          class="mb-[23px] max-w-[880px] font-display text-[clamp(2.7rem,5.2vw,5.8rem)] leading-[.95] font-extrabold tracking-[-.05em] max-[860px]:text-[clamp(2.3rem,6.4vw,4rem)] max-[600px]:text-[clamp(1.8rem,8vw,2.7rem)]"
        >
          {{ course.title }}
        </h1>
        <p
          class="mb-[34px] max-w-[700px] text-[clamp(.95rem,1.4vw,1.12rem)] leading-[1.65] text-white/72 max-[600px]:col-span-full max-[600px]:text-[.86rem]"
        >
          {{ course.description || "Your private course, ready whenever you are." }}
        </p>
        <div class="mb-[30px] max-w-[620px] max-[600px]:col-span-full">
          <div class="mb-[10px] flex justify-between text-[.74rem] font-[650] text-white/68">
            <span>Course progress</span
            ><strong class="text-white">{{ course.progressPercent }}%</strong>
          </div>
          <ProgressBar :value="course.progressPercent" light />
        </div>
        <div class="flex flex-wrap gap-[10px] max-[600px]:col-span-full">
          <RouterLink
            v-if="nextLesson"
            :to="{ name: 'player', params: { lessonId: nextLesson.id } }"
            class="inline-flex min-h-11 cursor-pointer items-center justify-center gap-[9px] rounded-[7px] border border-transparent bg-belt-light px-[18px] text-[.82rem] font-[750] text-pine-deep shadow-[0_8px_24px_rgb(21_51_38_/_20%)] transition-transform duration-[160ms] hover:-translate-y-px"
          >
            <span aria-hidden="true">▶</span>
            {{ nextLesson.positionSeconds ? "Resume course" : "Start course" }}
          </RouterLink>
          <button
            class="inline-flex min-h-11 cursor-pointer items-center justify-center gap-[9px] rounded-[7px] border border-white/24 bg-transparent px-[18px] text-[.82rem] font-[750] text-white transition-transform duration-[160ms] enabled:hover:-translate-y-px disabled:cursor-wait disabled:opacity-55"
            :disabled="resetting"
            @click="resetProgress"
          >
            {{ resetting ? "Resetting…" : "Reset progress" }}
          </button>
        </div>
      </div>
    </section>

    <section
      class="mx-auto w-[min(1380px,calc(100%-8vw))] pt-[clamp(52px,7vw,90px)] pb-[100px] max-[860px]:w-[min(100%-40px,1380px)]"
    >
      <div
        class="mb-6 flex items-end justify-between gap-6 max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-2"
      >
        <div>
          <p class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
            Ordered practice
          </p>
          <h2 class="font-display text-[clamp(1.9rem,3vw,2.7rem)] font-[750] tracking-[-.035em]">
            Course curriculum
          </h2>
        </div>
        <span class="text-[.78rem] font-semibold text-muted">
          {{ course.completedCount }} of {{ course.lessonCount }} completed
        </span>
      </div>
      <article
        v-for="section in course.sections"
        :key="section.id ?? 'direct'"
        class="mb-5 overflow-hidden rounded-[10px] border border-line bg-white shadow-[0_6px_22px_rgb(24_32_29_/_4%)]"
      >
        <header
          class="flex items-center justify-between border-b border-line bg-[#eef2ee] px-[22px] py-[18px]"
        >
          <h3 class="font-display text-[1.18rem]">{{ section.title }}</h3>
          <span class="text-[.7rem] text-muted">{{ section.lessons.length }} lessons</span>
        </header>
        <LessonRow
          v-for="(lesson, index) in section.lessons"
          :key="lesson.id"
          :lesson="lesson"
          :index="index"
        />
      </article>
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
    <div
      v-else
      class="grid min-h-80 place-items-center content-center rounded-[10px] border border-dashed border-[#bfc8c2] bg-white/55 p-10 text-center"
    >
      <h1 class="mb-2">Course unavailable</h1>
      <p class="mb-[22px] max-w-[480px] text-muted">{{ error }}</p>
      <RouterLink
        to="/"
        class="inline-flex min-h-11 cursor-pointer items-center justify-center gap-[9px] rounded-[7px] border border-transparent bg-pine px-[18px] text-[.82rem] font-[750] text-white shadow-[0_8px_24px_rgb(21_51_38_/_20%)] transition-[transform,background] duration-[160ms] hover:-translate-y-px hover:bg-pine-deep"
      >
        Back to library
      </RouterLink>
    </div>
  </main>
</template>
