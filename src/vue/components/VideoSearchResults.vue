<script setup lang="ts">
import type { VideoDto } from "@/api.js";
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import VideoCoverPlaceholder from "@/components/VideoCoverPlaceholder.vue";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";
import { playerLocation } from "@/router.js";

defineProps<{
  activeIndex: number;
  error: string;
  loading: boolean;
  videos: VideoDto[];
}>();
const emit = defineEmits<{ activate: [index: number]; close: [] }>();
const prefetch = useRoutePrefetch();

function videoContext(video: VideoDto): string {
  return [
    ...new Set([...video.authors, ...(video.playlistTitle ? [video.playlistTitle] : [])]),
  ].join(" · ");
}
</script>

<template>
  <div
    id="video-search-results"
    class="max-h-[min(480px,60vh)] overflow-y-auto px-2 py-2"
    aria-live="polite"
  >
    <p v-if="loading" class="px-3 py-3 text-sm text-muted">Searching videos…</p>
    <p v-else-if="error" class="px-3 py-3 text-sm text-clay">{{ error }}</p>
    <p v-else-if="!videos.length" class="px-3 py-3 text-sm text-muted">No matching videos</p>
    <ul v-else aria-label="Video search results" role="listbox">
      <li v-for="(video, index) in videos" :key="video.id">
        <IntentRouterLink
          :id="`video-search-result-${video.id}`"
          :to="playerLocation(video.id, video.playlistId)"
          :prefetch="() => prefetch.video(video.id)"
          class="grid min-h-[72px] grid-cols-[36px_96px_minmax(0,1fr)] items-center gap-x-3 rounded-[7px] border-l-4 px-3 py-2.5 focus-visible:outline-none max-[600px]:grid-cols-[28px_72px_minmax(0,1fr)] max-[600px]:gap-x-2 max-[600px]:px-2"
          :class="
            index === activeIndex
              ? 'border-belt bg-pine text-white'
              : 'border-transparent hover:bg-mist'
          "
          role="option"
          :aria-selected="index === activeIndex"
          @click="emit('close')"
          @pointerenter="emit('activate', index)"
        >
          <span
            class="font-mono text-[.7rem]"
            :class="index === activeIndex ? 'text-white/60' : 'text-muted'"
          >
            {{ String(index + 1).padStart(2, "0") }}
          </span>
          <span
            class="media-frame relative aspect-video w-24 overflow-hidden rounded-[5px] bg-mist max-[600px]:w-[72px]"
            aria-hidden="true"
          >
            <img
              v-if="video.coverUrl"
              :src="video.coverUrl"
              alt=""
              class="h-full w-full object-cover"
              loading="lazy"
            />
            <VideoCoverPlaceholder v-else class="h-full w-full" compact :title="video.title" />
          </span>
          <span class="min-w-0">
            <span
              class="block truncate text-sm font-bold"
              :class="index === activeIndex ? 'text-white' : 'text-ink'"
            >
              {{ video.title }}
            </span>
            <span
              v-if="videoContext(video)"
              class="mt-0.5 block truncate text-xs"
              :class="index === activeIndex ? 'text-white/65' : 'text-muted'"
            >
              {{ videoContext(video) }}
            </span>
          </span>
        </IntentRouterLink>
      </li>
    </ul>
  </div>
</template>
