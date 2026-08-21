<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useTemplateRef } from "vue";

import type { CourseDetailDto, LessonDto, PlaybackResult } from "@/api.js";
import AppButton from "@/components/ui/AppButton.vue";

defineProps<{
  course: CourseDetailDto | null;
  ended: boolean;
  error: string;
  loading: boolean;
  nextLesson?: LessonDto;
  playback: PlaybackResult | null;
  retrying: boolean;
}>();

const emit = defineEmits<{
  ended: [];
  loadedMetadata: [];
  openLessons: [];
  pause: [];
  retry: [];
  timeUpdate: [];
}>();
const video = useTemplateRef<HTMLVideoElement>("video");

defineExpose({ video });
</script>

<template>
  <div class="flex min-h-[34px] items-center justify-between">
    <RouterLink
      v-if="course"
      :to="{ name: 'course', params: { courseId: course.id } }"
      class="mb-0 inline-block max-w-[75%] overflow-hidden text-[.78rem] font-bold text-ellipsis whitespace-nowrap text-white/68 hover:text-white"
    >
      ← {{ course.title }}
    </RouterLink>
    <AppButton
      class="hidden rounded-[5px] border border-white/25 bg-transparent px-[11px] py-[7px] text-white max-[860px]:inline-flex"
      variant="unstyled"
      @click="emit('openLessons')"
    >
      Lessons
    </AppButton>
  </div>
  <div
    class="relative mx-auto mt-4 mb-[26px] grid aspect-video max-h-[calc(100vh-260px)] w-full place-items-center overflow-hidden rounded-[7px] border border-white/10 bg-[#070a08] shadow-[0_28px_80px_rgb(0_0_0_/_35%)] max-[860px]:max-h-none"
  >
    <video
      ref="video"
      class="h-full w-full object-contain"
      controls
      playsinline
      @loadedmetadata="emit('loadedMetadata')"
      @timeupdate="emit('timeUpdate')"
      @pause="emit('pause')"
      @ended="emit('ended')"
    />
    <div
      v-if="loading"
      class="absolute inset-0 grid place-items-center content-center bg-[#0c120f] p-[30px] text-center"
      role="status"
    >
      <div
        class="h-[42px] w-[42px] animate-spin rounded-full border-[3px] border-white/20 border-t-white"
      />
      <p class="mt-4 max-w-[540px] text-[.82rem] text-white/58">Preparing lesson…</p>
    </div>
    <div
      v-else-if="playback?.kind === 'converting'"
      class="absolute inset-0 grid place-items-center content-center bg-[#0c120f] p-[30px] text-center"
      role="status"
    >
      <div
        class="h-[58px] w-[58px] rounded-full bg-[conic-gradient(#e4c57f_var(--progress),rgb(255_255_255_/_12%)_0)] [mask:radial-gradient(circle,transparent_55%,black_57%)]"
        :style="{ '--progress': `${playback.progress * 3.6}deg` }"
      />
      <h2 class="mt-4 mb-[7px] font-display text-[clamp(1.6rem,3vw,2.8rem)]">
        Preparing this video
      </h2>
      <p class="max-w-[540px] text-[.82rem] text-white/58">
        {{ playback.progress }}% complete. This may take a moment.
      </p>
    </div>
    <div
      v-else-if="error"
      class="absolute inset-0 grid place-items-center content-center bg-[#0c120f] p-[30px] text-center"
    >
      <h2 class="mt-4 mb-[7px] font-display text-[clamp(1.6rem,3vw,2.8rem)]">Video unavailable</h2>
      <p class="max-w-[540px] text-[.82rem] text-white/58">{{ error }}</p>
      <AppButton
        v-if="playback?.kind === 'error'"
        class="mt-[22px]"
        variant="inverse"
        size="lg"
        :loading="retrying"
        loading-label="Retrying…"
        @click="emit('retry')"
      >
        Try again
      </AppButton>
    </div>
    <div
      v-if="ended"
      class="absolute inset-0 z-[3] grid place-items-center content-center bg-[rgb(12_18_15_/_92%)] p-[30px] text-center backdrop-blur-lg"
    >
      <span class="text-[.7rem] font-extrabold tracking-[.16em] text-belt-light uppercase">
        Lesson complete
      </span>
      <h2 class="mt-4 mb-[7px] font-display text-[clamp(1.6rem,3vw,2.8rem)]">
        {{ nextLesson ? "Ready for the next one?" : "Course complete." }}
      </h2>
      <AppButton
        v-if="nextLesson"
        :as="RouterLink"
        :to="{ name: 'player', params: { lessonId: nextLesson.id } }"
        class="mt-[18px]"
        variant="inverse"
        size="lg"
      >
        Next lesson →
      </AppButton>
    </div>
  </div>
</template>
