<script setup lang="ts">
import type { LessonDetailDto } from "@/api.js";
import ChapterList from "@/components/ChapterList.vue";
import AppButton from "@/components/ui/AppButton.vue";
import { countText } from "@/utils.js";

defineProps<{
  currentTime: number;
  video: LessonDetailDto | null;
  resetting: boolean;
}>();

const emit = defineEmits<{
  reset: [];
  seek: [startSeconds: number];
}>();
</script>

<template>
  <div
    v-if="video"
    class="flex items-start justify-between gap-[30px] max-[600px]:flex-col max-[600px]:gap-[22px]"
  >
    <div>
      <p class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
        {{ video.sectionTitle ?? "Videos" }}
      </p>
      <h1
        class="max-w-[800px] font-display text-[clamp(1.5rem,2.6vw,2.5rem)] leading-[1.05] tracking-[-.03em]"
      >
        {{ video.title }}
      </h1>
    </div>
    <div class="flex-none max-[600px]:w-full">
      <AppButton
        class="cursor-pointer border-0 border-b border-white/20 bg-transparent px-0 py-[7px] text-[.7rem] text-white/58"
        variant="unstyled"
        :loading="resetting"
        loading-label="Resetting…"
        @click="emit('reset')"
      >
        Reset video
      </AppButton>
    </div>
  </div>
  <section
    v-if="video?.chapters.length"
    class="mt-7 overflow-hidden rounded-[7px] border border-white/12 bg-[#f8f9f6] text-ink shadow-[0_20px_55px_rgb(0_0_0_/_18%)]"
    aria-labelledby="chapter-list-heading"
  >
    <header class="flex items-center justify-between gap-4 px-5 py-4 max-[600px]:px-4">
      <div>
        <p class="mb-1.5 text-[.65rem] font-extrabold tracking-[.18em] text-belt uppercase">
          Video outline
        </p>
        <h2 id="chapter-list-heading" class="font-display text-[1.15rem] font-extrabold">
          Chapters
        </h2>
      </div>
      <span class="font-mono text-[.72rem] font-semibold text-muted">
        {{ countText(video.chapters.length, "chapter") }}
      </span>
    </header>
    <div class="max-h-[380px] overflow-y-auto overscroll-contain border-t border-line">
      <ChapterList
        :chapters="video.chapters"
        :current-time="currentTime"
        @seek="emit('seek', $event)"
      />
    </div>
  </section>
</template>
