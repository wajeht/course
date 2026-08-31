<script setup lang="ts">
import { computed, useId } from "vue";

import type { PlaylistDetailDto } from "@/api.js";
import VideoRow from "@/components/VideoRow.vue";
import PlayerAutoplaySwitch from "@/pages/player/partials/PlayerAutoplaySwitch.vue";
import PlayerProgressMenu from "@/pages/player/partials/PlayerProgressMenu.vue";

const props = defineProps<{
  activeVideoId?: string;
  autoplayNext: boolean;
  playlist: PlaylistDetailDto | null;
  resetting: boolean;
}>();
defineEmits<{ autoplayChange: [enabled: boolean]; reset: [] }>();
const videos = computed(() => props.playlist?.sections.flatMap((section) => section.videos) ?? []);
const currentIndex = computed(() =>
  videos.value.findIndex((video) => video.id === props.activeVideoId),
);
const titleId = `playlist-title-${useId()}`;
</script>

<template>
  <aside
    v-if="playlist"
    class="sticky top-0 flex h-[calc(100vh-66px)] flex-col border-l border-[#343b44] bg-porcelain text-ink max-[860px]:static max-[860px]:mx-[clamp(20px,3vw,50px)] max-[860px]:mb-10 max-[860px]:h-auto max-[860px]:w-auto max-[860px]:overflow-hidden max-[860px]:rounded-[7px] max-[860px]:border max-[860px]:border-line max-[600px]:mx-3"
    :aria-labelledby="titleId"
  >
    <header class="border-b border-line px-5 py-5">
      <div class="flex items-start justify-between">
        <div class="min-w-0">
          <p class="text-xs font-extrabold tracking-[.16em] text-belt uppercase">Playlist</p>
          <h2 :id="titleId" class="mt-2 font-display text-lg font-bold">{{ playlist.title }}</h2>
          <p class="mt-1 text-xs text-muted">Video {{ currentIndex + 1 }} of {{ videos.length }}</p>
        </div>
        <PlayerProgressMenu
          label="Playlist actions"
          reset-label="Reset playlist progress"
          :resetting="resetting"
          tone="light"
          @reset="$emit('reset')"
        />
      </div>
      <PlayerAutoplaySwitch
        class="mt-4"
        :enabled="autoplayNext"
        @change="$emit('autoplayChange', $event)"
      />
    </header>
    <div class="flex-1 overflow-y-auto max-[860px]:overflow-visible">
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
