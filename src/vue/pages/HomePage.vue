<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { api, type CatalogDto, type ScanStatus } from "../api";
import CourseCard from "../components/CourseCard.vue";
import ProgressBar from "../components/ProgressBar.vue";

const catalog = ref<CatalogDto>({ courses: [], continueWatching: [] });
const scanStatus = ref<ScanStatus | null>(null);
const query = ref("");
const loading = ref(true);
const scanning = ref(false);
const error = ref("");
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const courseById = computed(
  () => new Map(catalog.value.courses.map((course) => [course.id, course])),
);

async function loadCatalog(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    catalog.value = await api.getCatalog(query.value || undefined);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Could not load your library";
  } finally {
    loading.value = false;
  }
}

async function rescanCatalog(): Promise<void> {
  scanning.value = true;
  error.value = "";
  try {
    scanStatus.value = await api.rescanCatalog();
    await loadCatalog();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Could not rescan the library";
  } finally {
    scanning.value = false;
  }
}

watch(query, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => void loadCatalog(), 220);
});

onMounted(async () => {
  await Promise.all([
    loadCatalog(),
    api.getScanStatus().then((status) => {
      scanStatus.value = status;
    }),
  ]);
});
</script>

<template>
  <main
    class="mx-auto w-[min(1380px,calc(100%-8vw))] pt-[clamp(48px,7vw,92px)] pb-[90px] max-[860px]:w-[min(100%-40px,1380px)] max-[600px]:pt-[42px]"
  >
    <section
      class="grid grid-cols-[minmax(0,1fr)_minmax(320px,.7fr)] items-end gap-12 pb-[clamp(44px,6vw,78px)] max-[860px]:grid-cols-1 max-[860px]:items-start max-[860px]:gap-[30px]"
    >
      <div>
        <p class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
          Personal learning library
        </p>
        <h1
          class="max-w-[720px] font-display text-[clamp(3.2rem,7vw,7rem)] leading-[.86] font-extrabold tracking-[-.055em] max-[860px]:text-[clamp(3.5rem,13vw,6.3rem)]"
        >
          Pick up where<br />you left off.
        </h1>
      </div>
      <div class="flex items-stretch gap-[10px] max-[600px]:flex-col">
        <label
          class="flex min-h-12 flex-1 items-center gap-3 rounded-[7px] border border-line bg-white px-4 shadow-[0_8px_30px_rgb(24_32_29_/_5%)] focus-within:border-pine focus-within:shadow-[0_0_0_3px_rgb(36_77_59_/_10%)]"
        >
          <svg
            class="w-5 flex-none fill-none stroke-pine stroke-[1.7] [stroke-linecap:round]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
          </svg>
          <span class="sr-only">Search courses and lessons</span>
          <input
            v-model="query"
            class="w-full min-w-0 border-0 bg-transparent p-0 text-ink outline-0 placeholder:text-[#89918d]"
            type="search"
            placeholder="Search courses and lessons"
          />
        </label>
        <button
          class="inline-flex min-h-11 cursor-pointer items-center justify-center gap-[9px] rounded-[7px] border border-line bg-white/60 px-[18px] text-[.82rem] font-[750] text-pine-deep transition-[transform,background,border-color] duration-[160ms] enabled:hover:-translate-y-px enabled:hover:border-[#abb8b0] enabled:hover:bg-white disabled:cursor-wait disabled:opacity-55 max-[600px]:self-start"
          :disabled="scanning"
          @click="rescanCatalog"
        >
          <svg
            class="w-[18px] fill-none stroke-current stroke-[1.8]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M20 7v5h-5M4 17v-5h5m10.1-3A8 8 0 0 0 5.5 6M4.9 15A8 8 0 0 0 18.5 18" />
          </svg>
          {{ scanning ? "Scanning…" : "Rescan" }}
        </button>
      </div>
    </section>

    <div
      v-if="error"
      class="mb-7 rounded-lg border border-[#e8b7ae] bg-[#f8e5e1] px-[18px] py-[14px] text-[.88rem] text-[#6c241c]"
    >
      {{ error }}
    </div>

    <section v-if="!query && catalog.continueWatching.length">
      <div
        class="mb-6 flex items-end justify-between gap-6 max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-2"
      >
        <div>
          <p class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
            In progress
          </p>
          <h2 class="font-display text-[clamp(1.9rem,3vw,2.7rem)] font-[750] tracking-[-.035em]">
            Continue watching
          </h2>
        </div>
      </div>
      <div
        class="-mx-1 grid auto-cols-[minmax(300px,420px)] grid-flow-col gap-4 overflow-x-auto px-1 pt-1 pb-[18px] [scroll-snap-type:x_proximity] max-[600px]:auto-cols-[86vw]"
      >
        <RouterLink
          v-for="lesson in catalog.continueWatching"
          :key="lesson.id"
          :to="{ name: 'player', params: { lessonId: lesson.id } }"
          class="group relative min-h-[230px] overflow-hidden rounded-[10px] bg-pine text-white shadow-course [scroll-snap-align:start]"
        >
          <img
            v-if="courseById.get(lesson.courseId)?.coverUrl"
            class="absolute inset-0 h-full w-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.035]"
            :src="courseById.get(lesson.courseId)?.coverUrl ?? ''"
            :alt="`${lesson.courseTitle} cover`"
          />
          <div
            v-else
            class="absolute inset-0 h-full w-full bg-pine bg-[repeating-linear-gradient(135deg,transparent_0_16px,rgb(255_255_255_/_5%)_16px_18px)]"
          />
          <div
            class="absolute inset-0 h-full w-full bg-[linear-gradient(90deg,rgb(12_28_21_/_96%)_0%,rgb(12_28_21_/_72%)_55%,rgb(12_28_21_/_30%)_100%)]"
          />
          <div class="absolute right-[25px] bottom-[23px] left-[25px] z-[2]">
            <p
              class="mb-[7px] max-w-[80%] text-[.65rem] font-[750] tracking-[.08em] text-belt-light uppercase"
            >
              {{ lesson.courseTitle }}
            </p>
            <h3 class="mb-5 max-w-[85%] text-xl leading-[1.15]">{{ lesson.title }}</h3>
            <ProgressBar :value="lesson.progressPercent" compact />
          </div>
          <span
            class="absolute top-5 right-5 z-[3] grid h-[42px] w-[42px] place-items-center rounded-full bg-white pl-0.5 text-[.75rem] text-pine-deep"
            aria-hidden="true"
          >
            ▶
          </span>
        </RouterLink>
      </div>
    </section>

    <section :class="!query && catalog.continueWatching.length ? 'mt-[70px]' : ''">
      <div
        class="mb-6 flex items-end justify-between gap-6 max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-2"
      >
        <div>
          <p class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
            {{ query ? "Search results" : "Your library" }}
          </p>
          <h2 class="font-display text-[clamp(1.9rem,3vw,2.7rem)] font-[750] tracking-[-.035em]">
            {{ query ? `${catalog.courses.length} matching courses` : "All courses" }}
          </h2>
        </div>
        <span v-if="scanStatus?.completedAt" class="text-[.78rem] font-semibold text-muted">
          {{
            scanStatus.warnings.length
              ? `${scanStatus.warnings.length} scan warnings`
              : "Library up to date"
          }}
        </span>
      </div>

      <div
        v-if="loading"
        class="grid grid-cols-4 gap-[clamp(18px,2vw,30px)] max-[1120px]:grid-cols-3 max-[860px]:grid-cols-2 max-[600px]:grid-cols-1"
        aria-label="Loading courses"
      >
        <div
          v-for="index in 4"
          :key="index"
          class="min-h-[420px] animate-pulse rounded-[10px] bg-[#e9ece8]"
        />
      </div>
      <div
        v-else-if="catalog.courses.length"
        class="grid grid-cols-4 gap-[clamp(18px,2vw,30px)] max-[1120px]:grid-cols-3 max-[860px]:grid-cols-2 max-[600px]:grid-cols-1"
      >
        <CourseCard v-for="course in catalog.courses" :key="course.id" :course="course" />
      </div>
      <div
        v-else
        class="grid min-h-80 place-items-center content-center rounded-[10px] border border-dashed border-[#bfc8c2] bg-white/55 p-10 text-center"
      >
        <span class="mb-1.5 text-5xl text-belt" aria-hidden="true">⌁</span>
        <h3 class="mb-2">{{ query ? "No lessons match that search" : "No courses found" }}</h3>
        <p class="mb-[22px] max-w-[480px] text-muted">
          {{
            query
              ? "Try a topic, instructor, or course title."
              : "Add a course folder to /videos, then rescan."
          }}
        </p>
      </div>
    </section>
  </main>
</template>
