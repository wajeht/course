<script setup lang="ts">
import { computed } from "vue";

import type { PlaylistDetailDto } from "@/api.js";
import VideoRow from "@/components/VideoRow.vue";
import AppButton from "@/components/ui/AppButton.vue";
import PlayerProgressMenu from "@/pages/player/partials/PlayerProgressMenu.vue";

const props = defineProps<{
  activeVideoId?: string;
  playlist: PlaylistDetailDto | null;
  open: boolean;
  resetting: boolean;
}>();
defineEmits<{ close: []; reset: [] }>();
const videos = computed(() => props.playlist?.sections.flatMap((section) => section.videos) ?? []);
const currentIndex = computed(() =>
  videos.value.findIndex((video) => video.id === props.activeVideoId),
);
</script>

<template>
  <aside
    v-if="playlist"
    class="sticky top-0 flex h-[calc(100vh-66px)] flex-col border-l border-[#2d3732] bg-[#f8f9f6] max-[860px]:fixed max-[860px]:inset-y-0 max-[860px]:right-0 max-[860px]:z-[70] max-[860px]:h-dvh max-[860px]:w-[min(390px,92vw)] max-[860px]:transition-transform"
    :class="open ? 'max-[860px]:translate-x-0' : 'max-[860px]:translate-x-[105%]'"
  >
    <header
      class="flex items-start justify-between border-b border-line px-5 py-5 max-[860px]:pt-[calc(1.25rem+env(safe-area-inset-top))]"
    >
      <div class="min-w-0">
        <p class="text-xs font-extrabold tracking-[.16em] text-belt uppercase">Playlist</p>
        <h2 class="mt-2 font-display text-lg font-bold">{{ playlist.title }}</h2>
        <p class="mt-1 text-xs text-muted">Video {{ currentIndex + 1 }} of {{ videos.length }}</p>
      </div>
      <div class="flex items-center gap-1">
        <PlayerProgressMenu
          label="Playlist actions"
          reset-label="Reset playlist progress"
          :resetting="resetting"
          tone="light"
          @reset="$emit('reset')"
        />
        <AppButton
          class="hidden max-[860px]:grid"
          variant="unstyled"
          aria-label="Close playlist"
          @click="$emit('close')"
          >×</AppButton
        >
      </div>
    </header>
    <div class="flex-1 overflow-y-auto">
      <section v-for="section in playlist.sections" :key="section.id ?? 'direct'">
        <h3
          class="sticky top-0 z-[2] border-y border-pine/15 bg-mist px-4 py-3 font-display text-xs font-extrabold tracking-[.08em] text-pine-deep uppercase"
        >
          {{ section.title }}
        </h3>
        <VideoRow
          v-for="(video, index) in section.videos"
          :key="video.id"
          :video="video"
          :index="index"
          :active="video.id === activeVideoId"
          sidebar
        />
      </section>
    </div>
  </aside>
</template>
