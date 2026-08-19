<script setup lang="ts">
import type { LessonDetailDto } from "@/api.js";
import ChapterList from "@/components/ChapterList.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppSelect from "@/components/ui/AppSelect.vue";

defineProps<{
  currentTime: number;
  lesson: LessonDetailDto | null;
  resetting: boolean;
}>();

const emit = defineEmits<{
  playbackRateChange: [];
  reset: [];
  seek: [startSeconds: number];
}>();
const playbackRate = defineModel<number>("playbackRate", { required: true });
const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
</script>

<template>
  <div
    v-if="lesson"
    class="flex items-start justify-between gap-[30px] max-[600px]:flex-col max-[600px]:gap-[22px]"
  >
    <div>
      <p class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
        {{ lesson.sectionTitle ?? "Lessons" }}
      </p>
      <h1
        class="max-w-[800px] font-display text-[clamp(1.5rem,2.6vw,2.5rem)] leading-[1.05] tracking-[-.03em]"
      >
        {{ lesson.title }}
      </h1>
    </div>
    <div
      class="flex flex-none items-center gap-[18px] max-[600px]:w-full max-[600px]:justify-between"
    >
      <label class="text-[.7rem] font-bold text-white/60">
        Speed
        <AppSelect
          v-model="playbackRate"
          class="ml-2 rounded-[5px] border border-white/16 bg-[#202824] py-1.5 pr-6 pl-2 text-white"
          variant="dark"
          @change="emit('playbackRateChange')"
        >
          <option v-for="rate in playbackRates" :key="rate" :value="rate">{{ rate }}×</option>
        </AppSelect>
      </label>
      <AppButton
        class="cursor-pointer border-0 border-b border-white/20 bg-transparent px-0 py-[7px] text-[.7rem] text-white/58"
        variant="unstyled"
        :loading="resetting"
        loading-label="Resetting…"
        @click="emit('reset')"
      >
        Reset lesson
      </AppButton>
    </div>
  </div>
  <section
    v-if="lesson?.chapters.length"
    class="mt-7 overflow-hidden rounded-[7px] border border-white/12 bg-[#f8f9f6] text-ink shadow-[0_20px_55px_rgb(0_0_0_/_18%)]"
    aria-labelledby="chapter-list-heading"
  >
    <header class="flex items-center justify-between gap-4 px-5 py-4 max-[600px]:px-4">
      <div>
        <p class="mb-1.5 text-[.65rem] font-extrabold tracking-[.18em] text-belt uppercase">
          Technique index
        </p>
        <h2 id="chapter-list-heading" class="font-display text-[1.15rem] font-extrabold">
          Chapters
        </h2>
      </div>
      <span class="font-mono text-[.72rem] font-semibold text-muted">
        {{ lesson.chapters.length }} total
      </span>
    </header>
    <div class="max-h-[380px] overflow-y-auto overscroll-contain border-t border-line">
      <ChapterList
        :chapters="lesson.chapters"
        :current-time="currentTime"
        @seek="emit('seek', $event)"
      />
    </div>
  </section>
</template>
