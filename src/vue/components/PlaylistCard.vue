<script setup lang="ts">
import type { DeepReadonly } from "vue";

import type { LibraryDto } from "@/api.js";
import AuthorLinks from "@/components/AuthorLinks.vue";
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import VideoCoverPlaceholder from "@/components/VideoCoverPlaceholder.vue";
import ProgressBar from "@/components/ui/ProgressBar.vue";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";
import { playerLocation } from "@/router.js";
import { countText } from "@/utils.js";

defineProps<{ playlist: DeepReadonly<LibraryDto["playlists"][number]> }>();
const prefetch = useRoutePrefetch();
</script>

<template>
  <article class="group min-w-0">
    <IntentRouterLink
      :to="playerLocation(playlist.nextVideoId, playlist.id)"
      :prefetch="() => prefetch.video(playlist.nextVideoId)"
      class="relative block aspect-video overflow-hidden rounded-[10px] bg-mist"
      :aria-label="`Open ${playlist.title}`"
    >
      <img
        v-if="playlist.coverUrl"
        class="h-full w-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.025] motion-reduce:transition-none"
        :src="playlist.coverUrl"
        :alt="`${playlist.title} cover`"
        loading="lazy"
      />
      <VideoCoverPlaceholder v-else class="h-full w-full" :title="playlist.title" />
      <span
        class="absolute right-0 bottom-0 flex h-full w-[38%] items-center justify-center bg-pine-deep/88 text-center text-[.7rem] font-bold text-white backdrop-blur-sm"
      >
        {{ countText(playlist.videoCount, "video") }}
      </span>
      <ProgressBar
        v-if="playlist.progressPercent > 0"
        class="absolute right-0 bottom-0 left-0"
        :value="playlist.progressPercent"
        label="Playlist progress"
        compact
      />
    </IntentRouterLink>
    <h3 class="mt-3 line-clamp-2 text-[.92rem] leading-[1.3] font-bold">
      <IntentRouterLink
        :to="playerLocation(playlist.nextVideoId, playlist.id)"
        :prefetch="() => prefetch.video(playlist.nextVideoId)"
        class="hover:text-pine"
      >
        {{ playlist.title }}
      </IntentRouterLink>
    </h3>
    <AuthorLinks
      v-if="playlist.authors.length"
      class="mt-1 block truncate text-[.72rem] text-muted"
      :authors="playlist.authors"
    />
  </article>
</template>
