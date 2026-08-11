<script setup lang="ts">
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { computed, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { api, type CatalogFilters } from "../api";
import CourseCard from "../components/CourseCard.vue";
import PaginationControls from "../components/PaginationControls.vue";
import { catalogKeys } from "../queries/queryKeys.js";

const route = useRoute();
const router = useRouter();

const instructorName = computed(() => String(route.params.instructorName));
const page = computed(() => {
  const value = typeof route.query.page === "string" ? Number.parseInt(route.query.page, 10) : 1;
  return Number.isInteger(value) && value > 0 ? value : 1;
});
const filters = computed<CatalogFilters>(() => ({
  instructor: instructorName.value,
  page: page.value,
  pageSize: 24,
}));
const instructorQuery = useQuery({
  queryKey: computed(() => catalogKeys.list(filters.value)),
  queryFn: ({ queryKey, signal }) => api.getCatalog(queryKey[2], signal),
  placeholderData: keepPreviousData,
});
const catalog = computed(() => instructorQuery.data.value ?? null);
const courses = computed(() => catalog.value?.courses ?? []);
const loading = computed(() => instructorQuery.isPending.value);
const refreshing = computed(
  () => instructorQuery.isFetching.value && !instructorQuery.isPending.value,
);
const error = computed(() => {
  const caught = instructorQuery.error.value;
  return caught instanceof Error ? caught.message : caught ? "Could not load this instructor" : "";
});
const instructorInitials = computed(() =>
  instructorName.value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase(),
);
function pageQuery(nextPage: number) {
  const query = { ...route.query };
  if (nextPage === 1) delete query.page;
  else query.page = String(nextPage);
  return query;
}

function setPage(nextPage: number): void {
  void router.push({ query: pageQuery(Math.max(1, nextPage)) });
}

watch(
  () => instructorQuery.dataUpdatedAt.value,
  () => {
    if (instructorQuery.isPlaceholderData.value) return;
    const loadedPage = catalog.value?.pagination.page;
    if (!loadedPage || loadedPage === page.value) return;
    void router.replace({ query: pageQuery(loadedPage) });
  },
);
</script>

<template>
  <main v-if="!loading && courses.length">
    <section
      class="border-b border-pine/15 bg-mist bg-[repeating-linear-gradient(0deg,transparent_0_47px,rgb(36_77_59_/_5%)_47px_48px)] px-[max(4vw,calc((100vw-1380px)/2))] py-[clamp(48px,7vw,88px)]"
    >
      <RouterLink
        to="/"
        class="mb-[38px] inline-block text-[.78rem] font-bold text-pine/70 hover:text-pine-deep"
      >
        ← Library
      </RouterLink>
      <div
        class="grid grid-cols-[minmax(210px,300px)_minmax(0,1fr)] items-center gap-[clamp(36px,7vw,100px)] max-[700px]:grid-cols-[110px_minmax(0,1fr)] max-[700px]:gap-6"
      >
        <div
          class="relative aspect-square overflow-hidden rounded-[10px] border border-white/15 bg-pine-deep text-white shadow-[0_24px_60px_rgb(21_51_38_/_22%)] before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-belt"
          aria-hidden="true"
        >
          <span
            class="absolute -right-[.05em] -bottom-[.21em] font-display text-[clamp(7rem,14vw,13rem)] leading-none font-black tracking-[-.1em] text-white/[.12] max-[700px]:text-[5.8rem]"
          >
            {{ instructorInitials }}
          </span>
          <span
            class="absolute top-5 left-6 text-[.62rem] font-extrabold tracking-[.18em] text-belt-light uppercase max-[700px]:top-4 max-[700px]:left-5"
          >
            Instructor file
          </span>
          <span
            class="absolute bottom-5 left-6 font-display text-[clamp(2.8rem,6vw,5.4rem)] leading-none font-black tracking-[-.06em] max-[700px]:bottom-4 max-[700px]:left-5 max-[700px]:text-[2.8rem]"
          >
            {{ instructorInitials }}
          </span>
        </div>
        <div>
          <p class="mb-3 text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
            Course instructor
          </p>
          <h1
            class="max-w-[900px] font-display text-[clamp(3.4rem,7vw,7.5rem)] leading-[.88] font-extrabold tracking-[-.055em] text-pine-deep max-[700px]:text-[clamp(2.3rem,9vw,4rem)]"
          >
            {{ instructorName }}
          </h1>
          <p class="mt-7 text-[.82rem] font-bold tracking-[.04em] text-pine max-[700px]:mt-4">
            {{ catalog?.pagination.totalCourses }}
            {{ catalog?.pagination.totalCourses === 1 ? "course" : "courses" }}
          </p>
        </div>
      </div>
    </section>

    <section
      :aria-busy="refreshing"
      class="mx-auto w-[min(1380px,calc(100%-8vw))] pt-[clamp(52px,7vw,86px)] pb-[100px] max-[860px]:w-[min(100%-40px,1380px)]"
    >
      <div class="mb-7">
        <p class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
          Instructor library
        </p>
        <h2 class="font-display text-[clamp(1.9rem,3vw,2.7rem)] font-[750] tracking-[-.035em]">
          Courses by {{ instructorName }}
        </h2>
      </div>
      <div
        class="grid grid-cols-4 gap-[clamp(18px,2vw,30px)] max-[1120px]:grid-cols-3 max-[860px]:grid-cols-2 max-[600px]:grid-cols-1"
      >
        <CourseCard v-for="course in courses" :key="course.id" :course="course" />
      </div>
      <PaginationControls
        :disabled="refreshing"
        :page="page"
        :total-pages="catalog?.pagination.totalPages ?? 0"
        @change="setPage"
      />
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
      <h1 class="mb-2">Instructor unavailable</h1>
      <p class="mb-[22px] max-w-[480px] text-muted">
        {{ error || `No courses list ${instructorName} as an instructor.` }}
      </p>
      <RouterLink
        to="/"
        class="inline-flex min-h-11 items-center justify-center rounded-[7px] bg-pine px-[18px] text-[.82rem] font-[750] text-white shadow-[0_8px_24px_rgb(21_51_38_/_20%)] transition-[transform,background] duration-[160ms] hover:-translate-y-px hover:bg-pine-deep"
      >
        Back to library
      </RouterLink>
    </div>
  </main>
</template>
