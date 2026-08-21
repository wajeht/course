<script setup lang="ts">
import type { CatalogDto } from "@/api.js";
import CourseCoverPlaceholder from "@/components/CourseCoverPlaceholder.vue";
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import AppButton from "@/components/ui/AppButton.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import PageHeader from "@/components/ui/PageHeader.vue";
import ProgressBar from "@/components/ui/ProgressBar.vue";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";

defineProps<{
  videos: CatalogDto["continueWatching"];
  loading: boolean;
}>();

const prefetch = useRoutePrefetch();
</script>

<template>
  <section>
    <PageHeader class="mb-6" eyebrow="Home" title="Continue watching" :heading-level="1" />

    <div
      v-if="loading"
      class="grid grid-cols-4 gap-[clamp(18px,2vw,30px)] max-[1120px]:grid-cols-3 max-[860px]:grid-cols-2 max-[600px]:grid-cols-1"
      aria-label="Loading videos"
      role="status"
    >
      <div
        v-for="index in 4"
        :key="index"
        class="min-h-[230px] animate-pulse rounded-[10px] bg-[#e9ece8]"
      />
    </div>
    <div
      v-else-if="videos.length"
      class="grid grid-cols-4 gap-[clamp(18px,2vw,30px)] max-[1120px]:grid-cols-3 max-[860px]:grid-cols-2 max-[600px]:grid-cols-1"
    >
      <IntentRouterLink
        v-for="video in videos"
        :key="video.id"
        :to="{ name: 'player', params: { lessonId: video.id } }"
        :prefetch="() => prefetch.video(video.id)"
        class="group relative min-h-[230px] min-w-0 overflow-hidden rounded-[10px] bg-pine text-white"
      >
        <img
          v-if="video.courseCoverUrl"
          class="absolute inset-0 h-full w-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.035] motion-reduce:transition-none"
          :src="video.courseCoverUrl"
          :alt="`${video.courseTitle} cover`"
        />
        <CourseCoverPlaceholder
          v-else
          class="absolute inset-0 h-full w-full"
          :title="video.courseTitle"
        />
        <div
          class="absolute inset-0 h-full w-full bg-[linear-gradient(90deg,rgb(12_28_21_/_96%)_0%,rgb(12_28_21_/_72%)_55%,rgb(12_28_21_/_30%)_100%)]"
        />
        <div class="absolute right-[25px] bottom-[23px] left-[25px] z-[2]">
          <p
            class="mb-[7px] max-w-[80%] text-[.65rem] font-[750] tracking-[.08em] text-belt-light uppercase"
          >
            {{ video.courseTitle }}
          </p>
          <h2 class="mb-5 max-w-[85%] text-xl leading-[1.15]">{{ video.title }}</h2>
          <ProgressBar :value="video.progressPercent" label="Video progress" compact />
        </div>
        <span
          class="absolute top-5 right-5 z-[3] grid h-[42px] w-[42px] place-items-center rounded-full bg-white pl-0.5 text-[.75rem] text-pine-deep"
          aria-hidden="true"
        >
          ▶
        </span>
      </IntentRouterLink>
    </div>
    <EmptyState
      v-else
      title="Nothing in progress"
      description="Start a playlist from your library and it will appear here."
      :heading-level="2"
    >
      <template #icon>▶</template>
      <template #actions>
        <AppButton :as="IntentRouterLink" to="/library" :prefetch="prefetch.library" size="lg">
          Browse library
        </AppButton>
      </template>
    </EmptyState>
  </section>
</template>
