<script setup lang="ts">
import { api } from "@/api.js";
import { computed, watch } from "vue";
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import CatalogFiltersToolbar from "@/pages/library/partials/CatalogFiltersToolbar.vue";
import CourseCardGrid from "@/pages/catalog/partials/CourseCardGrid.vue";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import PaginationControls from "@/components/ui/PaginationControls.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import { useCatalogFilters } from "@/composables/useCatalogFilters.js";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";
import StandardPageLayout from "@/layouts/StandardPageLayout.vue";
import { countText, setPageTitle } from "@/utils.js";

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
const headerTitle = computed(() => libraryTitle.value);

watch(
  headerTitle,
  (title) => setPageTitle(title),
  { immediate: true },
);

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
      <PageHeader class="mb-7" eyebrow="Your library" :title="headerTitle" :heading-level="1">
        <template #aside>
          <p v-if="scanStatus?.completedAt" class="text-[.78rem] font-semibold text-muted">
            <IntentRouterLink
              v-if="scanStatus.warnings.length"
              :to="{ path: '/settings/library', hash: '#settings-library-panel' }"
              :prefetch="prefetch.settings"
              class="text-belt underline decoration-belt/30 underline-offset-4 transition hover:decoration-belt"
            >
              {{ countText(scanStatus.warnings.length, "library issue") }}
            </IntentRouterLink>
            <span v-else>Library up to date</span>
          </p>
        </template>
      </PageHeader>

      <div
        class="mt-6 grid grid-cols-4 items-start gap-[clamp(18px,2vw,30px)] max-[1120px]:grid-cols-3 max-[860px]:grid-cols-2 max-[760px]:grid-cols-1"
      >
        <div class="md:col-span-1 max-[1120px]:col-span-1 max-[860px]:col-span-1 md:flex-shrink-0">
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
        <div class="col-span-3 md:min-w-0 max-[1120px]:col-span-2 max-[860px]:col-span-1">
          <CourseCardGrid v-if="loading || catalog.courses.length" :courses="catalog.courses" :loading />
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
