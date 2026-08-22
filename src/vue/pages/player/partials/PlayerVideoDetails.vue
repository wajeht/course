<script setup lang="ts">
import type { PlaylistDetailDto, VideoDetailDto } from "@/api.js";
import AuthorLinks from "@/components/AuthorLinks.vue";
import ChapterList from "@/components/ChapterList.vue";
import AppButton from "@/components/ui/AppButton.vue";
import PlayerVideoMenu from "@/pages/player/partials/PlayerVideoMenu.vue";
import { countText } from "@/utils.js";

defineProps<{
  currentTime: number;
  playlist: PlaylistDetailDto | null;
  video: VideoDetailDto | null;
  resetting: boolean;
}>();
defineEmits<{ openPlaylist: []; reset: []; seek: [startSeconds: number] }>();
</script>

<template>
  <div v-if="video" class="mt-4 flex items-start justify-between gap-8 max-[600px]:flex-col">
    <div class="min-w-0">
      <h1 class="max-w-[800px] font-display text-[clamp(1.35rem,2vw,2rem)] leading-[1.1]">
        {{ video.title }}
      </h1>
      <AuthorLinks
        v-if="video.authors.length"
        class="mt-2 block text-sm font-semibold text-white/72"
        :authors="video.authors"
      />
      <AppButton
        v-if="playlist"
        class="mt-3 min-[861px]:!hidden"
        variant="outline-inverse"
        size="sm"
        :aria-label="`Open playlist ${playlist.title}`"
        @click="$emit('openPlaylist')"
        >Playlist</AppButton
      >
      <p v-if="video.description" class="mt-4 max-w-[780px] text-sm leading-relaxed text-white/62">
        {{ video.description }}
      </p>
    </div>
    <PlayerVideoMenu :resetting="resetting" @reset="$emit('reset')" />
  </div>
  <section
    v-if="video?.chapters.length"
    class="mt-7 overflow-hidden rounded-[7px] border border-white/12 bg-[#f8f9f6] text-ink"
    aria-labelledby="chapters-heading"
  >
    <header class="flex items-center justify-between px-5 py-4">
      <h2 id="chapters-heading" class="font-display text-lg font-extrabold">Chapters</h2>
      <span class="font-mono text-xs text-muted">{{
        countText(video.chapters.length, "chapter")
      }}</span>
    </header>
    <ChapterList
      class="border-t border-line"
      :chapters="video.chapters"
      :current-time="currentTime"
      @seek="$emit('seek', $event)"
    />
  </section>
</template>
