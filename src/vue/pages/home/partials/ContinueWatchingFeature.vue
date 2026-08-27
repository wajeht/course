<script setup lang="ts">
import { computed, type DeepReadonly } from "vue";

import type { LibraryDto } from "@/api.js";
import AuthorLinks from "@/components/AuthorLinks.vue";
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import VideoCoverPlaceholder from "@/components/VideoCoverPlaceholder.vue";
import ProgressBar from "@/components/ui/ProgressBar.vue";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";
import { playerLocation } from "@/router.js";
import { durationText } from "@/utils.js";

const props = defineProps<{
  video: DeepReadonly<LibraryDto["continueWatching"][number]>;
}>();

const prefetch = useRoutePrefetch();
const to = computed(() => playerLocation(props.video.id, props.video.playlistId));
</script>

<template>
  <article class="min-w-0">
    <IntentRouterLink
      :to="to"
      :prefetch="() => prefetch.video(video.id)"
      class="media-frame group relative block aspect-video overflow-hidden rounded-[8px] bg-mist shadow-[0_18px_45px_rgb(32_37_43_/_16%)]"
      :aria-label="`Continue ${video.title}`"
    >
      <img
        v-if="video.coverUrl"
        class="h-full w-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.02] motion-reduce:transition-none"
        :src="video.coverUrl"
        :alt="`${video.title} cover`"
      />
      <VideoCoverPlaceholder v-else class="h-full w-full" :title="video.title" />
      <span
        class="absolute inset-0 grid place-items-center bg-pine-deep/8 opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none"
        aria-hidden="true"
      >
        <span
          class="grid h-14 w-14 place-items-center rounded-full bg-pine-deep/92 text-xl text-white"
        >
          ▶
        </span>
      </span>
      <span
        class="absolute right-3 bottom-3 rounded bg-black/80 px-2 py-1 font-mono text-[.68rem] text-white"
      >
        {{ durationText(video.durationSeconds) }}
      </span>
      <ProgressBar
        class="absolute right-0 bottom-0 left-0"
        :value="video.progressPercent"
        label="Video progress"
        compact
      />
    </IntentRouterLink>
    <p class="mt-4 font-mono text-[.65rem] font-bold tracking-[.13em] text-belt-ink uppercase">
      Continue
    </p>
    <h2
      class="mt-1 max-w-[760px] font-display text-[clamp(1.45rem,2.4vw,2.15rem)] leading-[1.02] font-black"
    >
      <IntentRouterLink :to="to" :prefetch="() => prefetch.video(video.id)" class="hover:text-pine">
        {{ video.title }}
      </IntentRouterLink>
    </h2>
    <AuthorLinks
      v-if="video.authors.length"
      class="mt-2 block text-[.78rem] text-muted"
      :authors="video.authors"
    />
  </article>
</template>
