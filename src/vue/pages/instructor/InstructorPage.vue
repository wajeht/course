<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { api, type CatalogFilters } from "@/api.js";
import CourseCardGrid from "@/pages/catalog/partials/CourseCardGrid.vue";
import InstructorHero from "@/pages/instructor/partials/InstructorHero.vue";
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import AppButton from "@/components/ui/AppButton.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import PaginationControls from "@/components/ui/PaginationControls.vue";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";
import { catalogQueryOptions } from "@/queries.js";
import { notFoundLocation } from "@/router.js";
import { setPageTitle } from "@/utils.js";

const route = useRoute();
const router = useRouter();
const prefetch = useRoutePrefetch();

const instructorName = computed(() => String(route.params.instructorName));
const page = computed(() => {
  const value = typeof route.query.page === "string" ? Number.parseInt(route.query.page, 10) : 1;
  return Number.isInteger(value) && value > 0 ? value : 1;
});
const filters = computed<CatalogFilters>(() => ({
  instructor: instructorName.value,
  page: page.value,
}));
const instructorRequest = useQuery(computed(() => catalogQueryOptions(filters.value, api)));
const loadedInstructorName = shallowRef("");
const catalog = computed(() =>
  loadedInstructorName.value === instructorName.value ? instructorRequest.data.value : undefined,
);
const courses = computed(() => catalog.value?.courses ?? []);
const loading = computed(
  () => instructorRequest.isPending.value || loadedInstructorName.value !== instructorName.value,
);
const refreshing = computed(
  () => instructorRequest.isFetching.value && !instructorRequest.isPending.value,
);
const error = computed(() => {
  const caught = instructorRequest.error.value;
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

watch(instructorName, (name) => setPageTitle(name), { immediate: true });

function pageQuery(nextPage: number) {
  const query = { ...route.query };
  if (nextPage === 1) delete query.page;
  else query.page = String(nextPage);
  return query;
}

function setPage(nextPage: number): void {
  void router.push({ query: pageQuery(Math.max(1, nextPage)) });
}

function prefetchPage(nextPage: number): void {
  void prefetch.catalog({ ...filters.value, page: nextPage });
}

watch(
  [instructorRequest.data, instructorRequest.isPlaceholderData],
  ([loadedCatalog, placeholder]) => {
    if (!loadedCatalog || placeholder) return;
    loadedInstructorName.value = instructorName.value;
    if (loadedCatalog.pagination.totalCourses === 0) {
      void router.replace(notFoundLocation(route.path));
      return;
    }
    const loadedPage = loadedCatalog.pagination.page;
    if (!loadedPage || loadedPage === page.value) return;
    void router.replace({ query: pageQuery(loadedPage) });
  },
);
</script>

<template>
  <main v-if="!loading && courses.length">
    <InstructorHero
      :course-count="catalog?.pagination.totalCourses ?? 0"
      :initials="instructorInitials"
      :name="instructorName"
    />

    <section
      :aria-busy="refreshing"
      class="mx-auto w-[min(1380px,calc(100%-8vw))] pt-[clamp(52px,7vw,86px)] pb-[100px] max-[860px]:w-[min(100%-40px,1380px)]"
    >
      <PageHeader
        class="mb-7"
        eyebrow="Courses"
        :title="`Courses by ${instructorName}`"
        :heading-level="2"
      />
      <CourseCardGrid :courses />
      <PaginationControls
        :disabled="refreshing"
        :page="page"
        :total-pages="catalog?.pagination.totalPages ?? 0"
        @change="setPage"
        @prefetch="prefetchPage"
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
    <EmptyState
      v-else
      title="Instructor unavailable"
      :description="error || `No courses list ${instructorName} as an instructor.`"
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
