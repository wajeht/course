<script setup lang="ts">
import AlertMessage from "@/components/ui/AlertMessage.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import PaginationControls from "@/components/ui/PaginationControls.vue";
import VideoGrid from "@/components/VideoGrid.vue";
import { useLibraryBrowser } from "@/composables/useLibraryBrowser.js";
import StandardPageLayout from "@/layouts/StandardPageLayout.vue";
import LibraryFiltersToolbar from "@/pages/library/partials/LibraryFiltersToolbar.vue";

const {
  clearFilters,
  error,
  hasActiveFilters,
  library,
  loading,
  page,
  query,
  refreshing,
  selectedAuthor,
  selectedTag,
  setPage,
} = useLibraryBrowser();
</script>

<template>
  <StandardPageLayout>
    <AlertMessage v-if="error" class="mb-7" size="lg">{{ error }}</AlertMessage>
    <section :aria-busy="refreshing">
      <PageHeader eyebrow="Your archive" title="All videos" :heading-level="1" />
      <div
        class="mt-6 grid grid-cols-[240px_minmax(0,1fr)] items-start gap-8 max-[760px]:grid-cols-1"
      >
        <LibraryFiltersToolbar
          v-model:author="selectedAuthor"
          v-model:query="query"
          v-model:tag="selectedTag"
          class="sticky top-[90px] max-h-[calc(100dvh-114px)] overflow-y-auto max-[760px]:static max-[760px]:max-h-none"
          :authors="library.authors"
          :has-active-filters="hasActiveFilters"
          :tags="library.tags"
          @clear="clearFilters"
        />
        <div class="min-w-0">
          <VideoGrid
            v-if="loading || library.videos.length"
            :videos="library.videos"
            :loading="loading"
          />
          <EmptyState
            v-else
            :title="hasActiveFilters ? 'No videos match these filters' : 'No videos found'"
            :description="
              hasActiveFilters
                ? 'Try another author, tag, or search term.'
                : 'Add a video to your videos folder, then refresh the library.'
            "
          >
            <template #icon>▶</template>
            <template v-if="!hasActiveFilters" #details
              >Server folder: <code>/videos</code></template
            >
          </EmptyState>
          <PaginationControls
            v-if="!loading"
            class="mt-8"
            :disabled="refreshing"
            :page="page"
            :total-pages="library.pagination.totalPages"
            @change="setPage"
          />
        </div>
      </div>
    </section>
  </StandardPageLayout>
</template>
