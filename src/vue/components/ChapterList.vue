<script setup lang="ts">
import { computed } from "vue";

import type { ChapterDto } from "@/api.js";
import AppButton from "@/components/ui/AppButton.vue";

const props = withDefaults(
  defineProps<{ chapters: ChapterDto[]; collapsed?: boolean; currentTime: number }>(),
  { collapsed: false },
);
const emit = defineEmits<{ seek: [startSeconds: number] }>();

const activeIndex = computed(() => {
  let active = -1;
  for (const [index, chapter] of props.chapters.entries()) {
    if (chapter.startSeconds > props.currentTime) break;
    active = index;
  }
  return active;
});

function timestampText(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}
</script>

<template>
  <ol aria-label="Video chapters">
    <li
      v-for="(chapter, index) in chapters"
      :key="chapter.startSeconds"
      :class="collapsed && index >= 3 ? 'max-[860px]:hidden' : ''"
    >
      <AppButton
        variant="unstyled"
        class="group grid min-h-[54px] w-full cursor-pointer grid-cols-[52px_20px_minmax(0,1fr)] items-center gap-2 border-b border-l-4 border-white/10 px-3 text-left text-white transition-colors last:border-b-0 hover:bg-white/5 focus-visible:z-[1] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-belt-light"
        :class="index === activeIndex ? 'border-l-belt bg-white/5' : 'border-l-transparent'"
        :aria-current="index === activeIndex ? 'true' : undefined"
        @click="emit('seek', chapter.startSeconds)"
      >
        <span
          class="font-mono text-[.68rem] font-semibold tabular-nums"
          :class="index === activeIndex ? 'text-belt-light' : 'text-white/48'"
        >
          {{ timestampText(chapter.startSeconds) }}
        </span>
        <span class="relative grid h-full place-items-center" aria-hidden="true">
          <span
            v-if="index < chapters.length - 1"
            class="absolute top-1/2 bottom-[-50%] left-1/2 w-px -translate-x-1/2 bg-white/14"
          />
          <span
            class="relative h-2.5 w-2.5 rounded-full border-2 transition-colors"
            :class="
              index === activeIndex
                ? 'border-belt-light bg-belt-light'
                : 'border-white/28 bg-transparent group-hover:border-white/55'
            "
          />
        </span>
        <span
          class="py-3 text-[.77rem] leading-[1.35] font-[680]"
          :class="index === activeIndex ? 'text-white' : 'text-white/78'"
        >
          {{ chapter.title }}
        </span>
      </AppButton>
    </li>
  </ol>
</template>
