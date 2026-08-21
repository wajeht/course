<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";

import { api, apiErrorMessage } from "@/api.js";
import AlertMessage from "@/components/ui/AlertMessage.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import PlaylistGrid from "@/components/PlaylistGrid.vue";
import VideoGrid from "@/components/VideoGrid.vue";
import StandardPageLayout from "@/layouts/StandardPageLayout.vue";
import ContinueWatchingSection from "@/pages/home/partials/ContinueWatchingSection.vue";
import { libraryQueryOptions } from "@/queries.js";

const request = useQuery(libraryQueryOptions({}, api));
const library = computed(() => request.data.value);
const error = computed(() => {
  const caught = request.error.value;
  return caught ? apiErrorMessage(caught, "Could not load your videos") : "";
});
</script>

<template>
  <StandardPageLayout>
    <AlertMessage v-if="error" class="mb-7" size="lg">{{ error }}</AlertMessage>
    <ContinueWatchingSection
      :videos="library?.continueWatching ?? []"
      :loading="request.isPending.value"
    />
    <section v-if="library?.playlists.length" class="mt-14">
      <PageHeader class="mb-6" eyebrow="Collections" title="Playlists" :heading-level="2" />
      <PlaylistGrid :playlists="library.playlists" />
    </section>
    <section v-if="library?.videos.length" class="mt-14">
      <PageHeader class="mb-6" eyebrow="Library" title="Videos" :heading-level="2" />
      <VideoGrid :videos="library.videos" />
    </section>
  </StandardPageLayout>
</template>
