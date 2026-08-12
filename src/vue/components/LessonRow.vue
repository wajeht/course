<script setup lang="ts">
import { RouterLink } from "vue-router";

import type { LessonDto } from "@/api.js";
import { durationText } from "@/utils.js";

withDefaults(
  defineProps<{ lesson: LessonDto; index: number; active?: boolean; sidebar?: boolean }>(),
  { active: false, sidebar: false },
);
</script>

<template>
  <RouterLink
    :to="{ name: 'player', params: { lessonId: lesson.id } }"
    class="grid items-center border-b border-[#e7eae7] py-2 transition-colors duration-150 last:border-b-0 hover:bg-[#f4f7f4]"
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
    <span
      class="min-w-0 overflow-hidden font-[650] text-ellipsis"
      :class="sidebar ? 'text-[.76rem] whitespace-normal' : 'text-[.83rem] whitespace-nowrap'"
    >
      {{ lesson.title }}
    </span>
    <span class="text-[.7rem] text-muted" :class="sidebar ? 'hidden' : 'max-[600px]:hidden'">
      {{ durationText(lesson.durationSeconds) }}
    </span>
    <span
      class="grid h-[27px] w-[27px] place-items-center justify-self-end rounded-full border text-[.58rem] font-extrabold"
      :class="lesson.completed ? 'border-pine bg-pine text-white' : 'border-line text-muted'"
    >
      <svg
        v-if="lesson.completed"
        class="w-[15px] fill-none stroke-current stroke-[2.4] [stroke-linecap:round] [stroke-linejoin:round]"
        viewBox="0 0 24 24"
        aria-label="Completed"
      >
        <path d="m5 12 4 4L19 6" />
      </svg>
      <span v-else-if="lesson.positionSeconds > 0">{{ lesson.progressPercent }}%</span>
      <span v-else aria-hidden="true">›</span>
    </span>
  </RouterLink>
</template>
