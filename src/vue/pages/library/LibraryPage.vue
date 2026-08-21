<script setup lang="ts">
import { api } from "@/api.js";
import CatalogFiltersToolbar from "@/pages/library/partials/CatalogFiltersToolbar.vue";
import CourseCardGrid from "@/pages/catalog/partials/CourseCardGrid.vue";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import PaginationControls from "@/components/ui/PaginationControls.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import { useCatalogFilters } from "@/composables/useCatalogFilters.js";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";
import StandardPageLayout from "@/layouts/StandardPageLayout.vue";

const {
  catalog,
  clearFilters,
  error,
  filters,
  hasActiveFilters,
  libraryTitle,
  loading,
  page,
  query,
  refreshing,
  selectedCategory,
  selectedInstructor,
  selectedTag,
  setPage,
} = useCatalogFilters(api);
const prefetch = useRoutePrefetch();

function prefetchPage(page: number): void {
  void prefetch.catalog({ ...filters.value, page });
}
</script>

<template>
  <StandardPageLayout>
    <AlertMessage v-if="error" class="mb-7" size="lg">
      {{ error }}
    </AlertMessage>

    <section id="catalog-results" :aria-busy="refreshing">
      <PageHeader eyebrow="Your library" :title="libraryTitle" :heading-level="1" />

      <div
        data-testid="catalog-layout"
        class="mt-6 grid grid-cols-1 items-start gap-[clamp(18px,2vw,30px)] min-[761px]:grid-cols-[260px_minmax(0,1fr)]"
      >
        <div
          data-testid="catalog-filter-column"
          class="sticky top-[calc(66px+env(safe-area-inset-top))] z-30 self-start max-[760px]:-mx-5 max-[760px]:bg-porcelain max-[760px]:px-5 max-[760px]:py-3 min-[761px]:top-[calc(90px+env(safe-area-inset-top))] min-[761px]:z-auto min-[761px]:max-h-[calc(100dvh-114px-env(safe-area-inset-top))] min-[761px]:overflow-y-auto"
        >
          <CatalogFiltersToolbar
            v-model:category="selectedCategory"
            v-model:instructor="selectedInstructor"
            v-model:query="query"
            v-model:tag="selectedTag"
            :categories="catalog.categories"
            :has-active-filters="hasActiveFilters"
            :instructors="catalog.instructors"
            :tags="catalog.tags"
            @clear="clearFilters"
          />
        </div>
        <div data-testid="catalog-course-column" class="min-w-0">
          <CourseCardGrid
            v-if="loading || catalog.courses.length"
            :courses="catalog.courses"
            layout="sidebar"
            :loading
          />
          <EmptyState
            v-else
            :title="hasActiveFilters ? 'No courses match these filters' : 'No courses found'"
            :description="
              hasActiveFilters
                ? 'Try another category, instructor, tag, or search term.'
                : 'Add a course to your video folder, then refresh the library.'
            "
          >
            <template #icon>⌁</template>
            <template v-if="!hasActiveFilters" #details>
              Server folder: <code>/videos</code>
            </template>
          </EmptyState>

          <PaginationControls
            v-if="!loading"
            class="mt-8"
            :disabled="refreshing"
            :page="page"
            :total-pages="catalog.pagination.totalPages"
            @change="setPage"
            @prefetch="prefetchPage"
          />
        </div>
      </div>
    </section>
  </StandardPageLayout>
</template>
