<script setup lang="ts">
import AlertMessage from "@/components/ui/AlertMessage.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import PaginationControls from "@/components/ui/PaginationControls.vue";
import PlaylistGrid from "@/components/PlaylistGrid.vue";
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
  selectedView,
  setPage,
} = useLibraryBrowser();
</script>

<template>
  <StandardPageLayout>
    <AlertMessage v-if="error" class="mb-7" size="lg">{{ error }}</AlertMessage>
    <section :aria-busy="refreshing">
      <PageHeader
        eyebrow="Your archive"
        :title="selectedView === 'playlists' ? 'Playlists' : 'All videos'"
        :heading-level="1"
      />
      <div
        class="mt-6 grid grid-cols-[240px_minmax(0,1fr)] items-start gap-8 max-[760px]:grid-cols-1"
      >
        <LibraryFiltersToolbar
          v-model:author="selectedAuthor"
          v-model:query="query"
          v-model:tag="selectedTag"
          v-model:view="selectedView"
          class="sticky top-[90px] max-h-[calc(100dvh-114px)] overflow-y-auto max-[760px]:static max-[760px]:max-h-none"
          :authors="library.authors"
          :has-active-filters="hasActiveFilters"
          :tags="library.tags"
          @clear="clearFilters"
        />
        <div class="min-w-0">
          <PlaylistGrid
            v-if="selectedView === 'playlists' && library.playlists.length"
            :playlists="library.playlists"
          />
          <VideoGrid
            v-else-if="selectedView === 'videos' && (loading || library.videos.length)"
            :videos="library.videos"
            :loading="loading"
          />
          <EmptyState
            v-else-if="!loading"
            :title="
              selectedView === 'playlists'
                ? 'No playlists match these filters'
                : hasActiveFilters
                  ? 'No videos match these filters'
                  : 'No videos found'
            "
            :description="
              selectedView === 'playlists'
                ? 'Try another author, tag, or search term.'
                : hasActiveFilters
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
            v-if="selectedView === 'videos' && !loading"
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
