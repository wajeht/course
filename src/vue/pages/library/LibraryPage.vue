<script setup lang="ts">
import { api } from "@/api.js";
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import CatalogFiltersToolbar from "@/pages/library/partials/CatalogFiltersToolbar.vue";
import CourseCardGrid from "@/pages/catalog/partials/CourseCardGrid.vue";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import PaginationControls from "@/components/ui/PaginationControls.vue";
import { useCatalogFilters } from "@/composables/useCatalogFilters.js";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";
import StandardPageLayout from "@/layouts/StandardPageLayout.vue";
import { countText } from "@/utils.js";

const {
  catalog,
  error,
  filters,
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
            <IntentRouterLink
              v-if="scanStatus.warnings.length"
              to="/settings/library"
              :prefetch="prefetch.settings"
              class="text-[.78rem] font-semibold text-belt underline decoration-belt/30 underline-offset-4 hover:decoration-belt"
            >
              {{ countText(scanStatus.warnings.length, "library issue") }}
            </IntentRouterLink>
            <span v-else class="text-[.78rem] font-semibold text-muted">Library up to date</span>
          </template>
        </template>
      </PageHeader>

      <CatalogFiltersToolbar
        v-model:category="selectedCategory"
        v-model:instructor="selectedInstructor"
        v-model:query="query"
        v-model:tag="selectedTag"
        :categories="catalog.categories"
        :instructors="catalog.instructors"
        :tags="catalog.tags"
      />

      <CourseCardGrid
        v-if="loading || catalog.courses.length"
        :courses="catalog.courses"
        :loading
      />
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
            : 'Add a course to your video folder, then refresh the library.'
        "
      >
        <template #icon>⌁</template>
        <template
          v-if="!query && !selectedCategory && !selectedInstructor && !selectedTag"
          #details
        >
          Server folder: <code>/videos</code>
        </template>
      </EmptyState>

      <PaginationControls
        v-if="!loading"
        :disabled="refreshing"
        :page="page"
        :total-pages="catalog.pagination.totalPages"
        @change="setPage"
        @prefetch="prefetchPage"
      />
    </section>
  </StandardPageLayout>
</template>
