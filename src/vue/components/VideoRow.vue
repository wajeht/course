<script setup lang="ts">
import type { VideoDto } from "@/api.js";
import IntentRouterLink from "@/components/IntentRouterLink.vue";
import { useRoutePrefetch } from "@/composables/useRoutePrefetch.js";
import { playerLocation } from "@/router.js";
import { durationText } from "@/utils.js";

withDefaults(
  defineProps<{ video: VideoDto; index: number; active?: boolean; sidebar?: boolean }>(),
  {
    active: false,
    sidebar: false,
  },
);
const prefetch = useRoutePrefetch();
</script>

<template>
  <IntentRouterLink
    :to="playerLocation(video.id, video.playlistId)"
    :prefetch="() => prefetch.video(video.id)"
    class="grid items-center border-b border-[#e7eae7] py-2 transition-colors last:border-b-0 hover:bg-[#f4f7f4]"
    :class="[
      sidebar
        ? 'min-h-14 grid-cols-[28px_minmax(0,1fr)_30px] gap-2 px-3'
        : 'min-h-[62px] grid-cols-[42px_minmax(0,1fr)_auto_42px] gap-3 px-4 max-[600px]:grid-cols-[31px_minmax(0,1fr)_32px] max-[600px]:gap-[7px] max-[600px]:px-[10px]',
      active && 'bg-[#f4f7f4] shadow-[inset_4px_0_#c4933f]',
    ]"
  >
    <span class="font-mono text-[.72rem] text-[#9da6a1]">
      {{ String(index + 1).padStart(2, "0") }}
    </span>
    <span class="min-w-0 overflow-hidden text-[.8rem] font-semibold text-ellipsis">
      {{ video.title }}
    </span>
    <span class="text-[.7rem] text-muted" :class="sidebar ? 'hidden' : 'max-[600px]:hidden'">
      {{ durationText(video.durationSeconds) }}
    </span>
    <span
      class="grid h-[27px] w-[27px] place-items-center justify-self-end rounded-full border text-[.58rem] font-extrabold"
      :class="video.completed ? 'border-pine bg-pine text-white' : 'border-line text-muted'"
    >
      <span v-if="video.completed" aria-label="Completed">✓</span>
      <span v-else-if="video.positionSeconds > 0">{{ video.progressPercent }}%</span>
      <span v-else aria-hidden="true">›</span>
    </span>
  </IntentRouterLink>
</template>
