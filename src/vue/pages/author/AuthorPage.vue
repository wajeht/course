<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { apiErrorMessage } from "@/api.js";
import PlaylistGrid from "@/components/PlaylistGrid.vue";
import VideoGrid from "@/components/VideoGrid.vue";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import PaginationControls from "@/components/ui/PaginationControls.vue";
import StandardPageLayout from "@/layouts/StandardPageLayout.vue";
import { libraryQueryOptions } from "@/queries.js";
import { notFoundLocation } from "@/router.js";
import { setPageTitle } from "@/utils.js";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const authorName = computed(() => String(route.params.authorName));
const page = computed(() => {
  const value = typeof route.query.page === "string" ? Number.parseInt(route.query.page, 10) : 1;
  return Number.isInteger(value) && value > 0 ? value : 1;
});
const filters = computed(() => ({ author: [authorName.value], page: page.value }));
const request = useQuery(computed(() => libraryQueryOptions(filters.value)));
const library = computed(() => (request.isPlaceholderData.value ? undefined : request.data.value));
const author = computed(() =>
  library.value?.authors.find(
    ({ name }) => name.localeCompare(authorName.value, undefined, { sensitivity: "accent" }) === 0,
  ),
);
const loading = computed(() => request.isPending.value || request.isPlaceholderData.value);
const refreshing = computed(() => request.isFetching.value && !loading.value);
const error = computed(() => {
  const caught = request.error.value;
  return caught ? apiErrorMessage(caught, "Could not load this author") : "";
});

function pageQuery(nextPage: number) {
  return nextPage === 1 ? {} : { page: String(nextPage) };
}

function setPage(nextPage: number): void {
  void router.push({ query: pageQuery(Math.max(1, nextPage)) });
}

function prefetchPage(nextPage: number): void {
  void queryClient.prefetchQuery(
    libraryQueryOptions({ author: [authorName.value], page: Math.max(1, nextPage) }),
  );
}

watch(
  [authorName, author],
  ([requestedName, loadedAuthor]) => setPageTitle(loadedAuthor?.name ?? requestedName),
  { immediate: true },
);
watch(
  [request.isSuccess, request.isPlaceholderData, library],
  ([success, placeholder, loadedLibrary]) => {
    if (!success || placeholder || !loadedLibrary) return;
    if (!author.value) {
      void router.replace(notFoundLocation(route.path));
      return;
    }
    if (loadedLibrary.pagination.page !== page.value) {
      void router.replace({ query: pageQuery(loadedLibrary.pagination.page) });
    }
  },
  { immediate: true },
);
</script>

<template>
  <StandardPageLayout>
    <AlertMessage v-if="error" class="mb-7" size="lg">{{ error }}</AlertMessage>
    <section :aria-busy="refreshing">
      <PageHeader eyebrow="Author" :title="author?.name ?? authorName" :heading-level="1" />

      <section v-if="page === 1 && library?.playlists.length" class="mt-12">
        <PageHeader class="mb-6" eyebrow="Collections" title="Playlists" :heading-level="2" />
        <PlaylistGrid :playlists="library.playlists" />
      </section>

      <section class="mt-12">
        <PageHeader class="mb-6" eyebrow="Archive" title="Videos" :heading-level="2" />
        <VideoGrid
          v-if="loading || library?.videos.length"
          :videos="library?.videos ?? []"
          :loading="loading"
        />
        <EmptyState
          v-else-if="author"
          title="No videos found"
          :description="`No videos are currently credited to ${author.name}.`"
        >
          <template #icon>▶</template>
        </EmptyState>
        <PaginationControls
          v-if="library && !loading"
          class="mt-8"
          :disabled="refreshing"
          :page="page"
          :total-pages="library.pagination.totalPages"
          @change="setPage"
          @prefetch="prefetchPage"
        />
      </section>
    </section>
  </StandardPageLayout>
</template>
