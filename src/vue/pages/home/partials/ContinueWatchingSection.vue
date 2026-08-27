<script setup lang="ts">
import { computed } from "vue";

import type { LibraryDto } from "@/api.js";
import AppButton from "@/components/ui/AppButton.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import VideoCard from "@/components/VideoCard.vue";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";
import ContinueWatchingFeature from "@/pages/home/partials/ContinueWatchingFeature.vue";

const props = defineProps<{ videos: LibraryDto["continueWatching"]; loading: boolean }>();
const prefetch = useRoutePrefetch();
const featuredVideo = computed(() => props.videos[0]);
const queuedVideos = computed(() => props.videos.slice(1));
</script>

<template>
  <section>
    <PageHeader class="mb-6" eyebrow="Home" title="Continue watching" :heading-level="1" />
    <div
      v-if="loading"
      class="grid grid-cols-[minmax(0,1.5fr)_minmax(240px,.5fr)] gap-8 max-[860px]:grid-cols-1"
      aria-label="Loading videos"
      role="status"
    >
      <div class="aspect-video animate-pulse rounded-[8px] bg-mist" />
      <div class="grid content-start gap-5">
        <div
          v-for="index in 2"
          :key="index"
          class="aspect-video animate-pulse rounded-[8px] bg-mist"
        />
      </div>
    </div>
    <div
      v-else-if="featuredVideo"
      class="grid grid-cols-[minmax(0,1.55fr)_minmax(240px,.45fr)] items-start gap-[clamp(24px,3vw,44px)] max-[860px]:grid-cols-1"
    >
      <ContinueWatchingFeature :video="featuredVideo" />
      <section v-if="queuedVideos.length" aria-labelledby="up-next-title">
        <div class="mb-4 flex items-end justify-between border-b border-line pb-3">
          <h2 id="up-next-title" class="font-display text-xl font-black uppercase">Up next</h2>
          <span class="font-mono text-[.65rem] text-muted">{{ queuedVideos.length }}</span>
        </div>
        <div class="grid gap-6 max-[860px]:grid-cols-2 max-[520px]:grid-cols-1">
          <VideoCard v-for="video in queuedVideos" :key="video.id" :video="video" />
        </div>
      </section>
    </div>
    <EmptyState
      v-else
      title="Nothing in progress"
      description="Start a video and it will appear here."
      :heading-level="2"
    >
      <template #icon>▶</template>
      <template #actions>
        <AppButton :as="IntentRouterLink" to="/videos" :prefetch="prefetch.videos" size="lg"
          >Browse videos</AppButton
        >
      </template>
    </EmptyState>
  </section>
</template>
