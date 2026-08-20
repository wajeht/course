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
        class="mt-6 grid grid-cols-4 items-start gap-[clamp(18px,2vw,30px)] max-[1120px]:grid-cols-3 max-[860px]:grid-cols-2 max-[760px]:grid-cols-1"
      >
        <div>
          <CatalogFiltersToolbar
            v-model:category="selectedCategory"
            v-model:instructor="selectedInstructor"
            v-model:query="query"
            v-model:tag="selectedTag"
            :categories="catalog.categories"
            :instructors="catalog.instructors"
            :tags="catalog.tags"
          />
        </div>
        <div class="col-span-3 min-w-0 max-[1120px]:col-span-2 max-[860px]:col-span-1">
          <CourseCardGrid
            v-if="loading || catalog.courses.length"
            :courses="catalog.courses"
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
