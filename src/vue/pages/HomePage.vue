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
import ProgressBar from "@/components/ui/ProgressBar.vue";
import { useCatalogFilters } from "@/composables/useCatalogFilters.js";
import StandardPageLayout from "@/layouts/StandardPageLayout.vue";

const {
  catalog,
  error,
  hasActiveFilters,
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
    <AlertMessage v-if="error" class="mb-7 px-[18px] py-[14px] text-[.88rem]">
      {{ error }}
    </AlertMessage>

    <section v-if="!hasActiveFilters && catalog.continueWatching.length">
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
            v-if="lesson.courseCoverUrl"
            class="absolute inset-0 h-full w-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.035]"
            :src="lesson.courseCoverUrl"
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

    <section
      id="catalog-results"
      :aria-busy="refreshing"
      :class="!hasActiveFilters && catalog.continueWatching.length ? 'mt-[70px]' : ''"
    >
      <PageHeader
        class="mb-6"
        :eyebrow="
          query ? 'Search results' : selectedFilters.length ? 'Filtered library' : 'Your library'
        "
        :title="libraryTitle"
        :heading-level="1"
      >
        <template #aside>
          <span v-if="scanStatus?.completedAt" class="text-[.78rem] font-semibold text-muted">
            {{
              scanStatus.warnings.length
                ? `${scanStatus.warnings.length} scan warnings`
                : "Library up to date"
            }}
          </span>
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
