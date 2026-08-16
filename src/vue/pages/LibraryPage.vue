<script setup lang="ts">
import { RouterLink } from "vue-router";

import { api } from "@/api.js";
import CourseCard from "@/components/CourseCard.vue";
import CourseFilterSelect from "@/components/CourseFilterSelect.vue";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import AppInput from "@/components/ui/AppInput.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import PaginationControls from "@/components/ui/PaginationControls.vue";
import { useCatalogFilters } from "@/composables/useCatalogFilters.js";
import StandardPageLayout from "@/layouts/StandardPageLayout.vue";
import { countText } from "@/utils.js";

const {
  catalog,
  error,
  libraryTitle,
  loading,
  page,
  query,
  refreshing,
  scanStatus,
  selectedCategory,
  selectedFilters,
  selectedInstructor,
  selectedTag,
  setPage,
} = useCatalogFilters(api);
</script>

<template>
  <StandardPageLayout>
    <AlertMessage v-if="error" class="mb-7" size="lg">
      {{ error }}
    </AlertMessage>

    <section id="catalog-results" :aria-busy="refreshing">
      <PageHeader
        class="mb-6"
        :eyebrow="
          query ? 'Search results' : selectedFilters.length ? 'Filtered library' : 'Your library'
        "
        :title="libraryTitle"
        :heading-level="1"
      >
        <template #aside>
          <template v-if="scanStatus?.completedAt">
            <RouterLink
              v-if="scanStatus.warnings.length"
              to="/settings"
              class="text-[.78rem] font-semibold text-belt underline decoration-belt/30 underline-offset-4 hover:decoration-belt"
            >
              {{ countText(scanStatus.warnings.length, "library issue") }}
            </RouterLink>
            <span v-else class="text-[.78rem] font-semibold text-muted">Library up to date</span>
          </template>
        </template>
      </PageHeader>

      <div class="mb-7 flex flex-wrap items-stretch gap-2">
        <CourseFilterSelect
          v-model="selectedCategory"
          label="Category"
          all-label="All categories"
          :options="catalog.categories"
        >
          <svg
            class="w-[17px] flex-none fill-none stroke-pine stroke-[1.7] [stroke-linecap:round]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M4 5.5h6.5V12H4zM13.5 5.5H20V12h-6.5zM4 15h6.5M13.5 15H20" />
          </svg>
        </CourseFilterSelect>
        <CourseFilterSelect
          v-model="selectedInstructor"
          label="Instructor"
          all-label="All instructors"
          :options="catalog.instructors"
        >
          <svg
            class="w-[17px] flex-none fill-none stroke-pine stroke-[1.7] [stroke-linecap:round]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5.5 20c.5-4.1 2.7-6.2 6.5-6.2s6 2.1 6.5 6.2" />
          </svg>
        </CourseFilterSelect>
        <CourseFilterSelect
          v-model="selectedTag"
          label="Tag"
          all-label="All tags"
          :options="catalog.tags"
        >
          <svg
            class="w-[17px] flex-none fill-none stroke-pine stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="m4 12 8.5-8.5H20V11l-8.5 8.5L4 12Z" />
            <circle cx="16.5" cy="7" r="1" />
          </svg>
        </CourseFilterSelect>
        <label
          class="flex min-h-10 min-w-[240px] flex-1 items-center gap-2.5 rounded-[7px] border border-line bg-white px-3.5 shadow-[0_8px_30px_rgb(24_32_29_/_5%)] focus-within:border-pine focus-within:shadow-[0_0_0_3px_rgb(36_77_59_/_10%)] max-[700px]:w-full max-[700px]:min-w-0"
        >
          <svg
            class="w-[18px] flex-none fill-none stroke-pine stroke-[1.7] [stroke-linecap:round]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
          </svg>
          <span class="sr-only">Search courses and lessons</span>
          <AppInput
            v-model="query"
            class="w-full min-w-0 border-0 bg-transparent p-0 text-[.85rem] text-ink outline-0 placeholder:text-[#89918d]"
            variant="bare"
            type="search"
            placeholder="Search courses and lessons"
          />
        </label>
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
      <EmptyState
        v-else
        :title="
          query || selectedCategory || selectedInstructor || selectedTag
            ? 'No courses match these filters'
            : 'No courses found'
        "
        :description="
          query || selectedCategory || selectedInstructor || selectedTag
            ? 'Try another category, instructor, tag, or search term.'
            : 'Add a course folder to /videos, then rescan.'
        "
      >
        <template #icon>⌁</template>
      </EmptyState>

      <PaginationControls
        v-if="!loading"
        :disabled="refreshing"
        :page="page"
        :total-pages="catalog.pagination.totalPages"
        @change="setPage"
      />
    </section>
  </StandardPageLayout>
</template>
