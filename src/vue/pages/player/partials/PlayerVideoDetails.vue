<script setup lang="ts">
import { computed, shallowRef, useId, watch } from "vue";

import type { VideoDetailDto } from "@/api.js";
import AuthorLinks from "@/components/AuthorLinks.vue";
import ChapterList from "@/components/ChapterList.vue";
import AppButton from "@/components/ui/AppButton.vue";
import PlayerProgressMenu from "@/pages/player/partials/PlayerProgressMenu.vue";

const props = defineProps<{
  currentTime: number;
  video: VideoDetailDto | null;
  resetting: boolean;
}>();
defineEmits<{ reset: []; seek: [startSeconds: number] }>();

const expanded = shallowRef(false);
const detailsId = `video-details-${useId()}`;
const expandable = computed(
  () => Boolean(props.video?.description) || (props.video?.chapters.length ?? 0) > 3,
);

watch(
  () => props.video?.id,
  () => {
    expanded.value = false;
  },
);
</script>

<template>
  <section v-if="video" class="mt-4 text-white" aria-labelledby="video-title">
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <h1 id="video-title" class="font-display text-[clamp(1.35rem,2vw,2rem)] leading-[1.1]">
          {{ video.title }}
        </h1>
        <AuthorLinks
          v-if="video.authors.length"
          class="mt-2 block text-sm font-semibold text-white/72"
          :authors="video.authors"
        />
      </div>
      <PlayerProgressMenu
        label="Video actions"
        reset-label="Reset progress"
        :resetting="resetting"
        @reset="$emit('reset')"
      />
    </header>

    <div
      v-if="video.description || video.chapters.length"
      :id="detailsId"
      class="mt-4 border-t border-white/10 pt-4"
    >
      <p
        v-if="video.description"
        class="max-w-[780px] text-sm leading-relaxed text-white/62"
        :class="expanded ? '' : 'max-[860px]:line-clamp-2'"
      >
        {{ video.description }}
      </p>
      <ChapterList
        v-if="video.chapters.length"
        :class="video.description ? 'mt-4' : ''"
        :chapters="video.chapters"
        :collapsed="!expanded"
        :current-time="currentTime"
        @seek="$emit('seek', $event)"
      />
    </div>

    <AppButton
      v-if="expandable"
      variant="unstyled"
      class="mx-auto mt-2 hidden h-9 w-12 place-items-center text-xl text-white/62 max-[860px]:grid"
      :aria-controls="detailsId"
      :aria-expanded="expanded"
      :aria-label="expanded ? 'Collapse video details' : 'Expand video details'"
      @click="expanded = !expanded"
    >
      <span
        class="transition-transform duration-150"
        :class="expanded ? 'rotate-180' : ''"
        aria-hidden="true"
        >⌄</span
      >
    </AppButton>
  </section>
</template>
