<script setup lang="ts">
import { RouterLink } from "vue-router";

import type { LessonDto } from "../api/client";
import { formatDuration } from "../utils/format";

withDefaults(defineProps<{ lesson: LessonDto; index: number; active?: boolean }>(), {
  active: false,
});
</script>

<template>
  <RouterLink
    :to="{ name: 'player', params: { lessonId: lesson.id } }"
    class="lesson-row"
    :class="{ 'lesson-row--active': active }"
  >
    <span class="lesson-row__number">{{ String(index + 1).padStart(2, "0") }}</span>
    <span class="lesson-row__title">{{ lesson.title }}</span>
    <span class="lesson-row__duration">{{ formatDuration(lesson.durationSeconds) }}</span>
    <span class="lesson-row__state" :class="{ 'lesson-row__state--complete': lesson.completed }">
      <svg v-if="lesson.completed" viewBox="0 0 24 24" aria-label="Completed">
        <path d="m5 12 4 4L19 6" />
      </svg>
      <span v-else-if="lesson.positionSeconds > 0">{{ lesson.progressPercent }}%</span>
      <span v-else aria-hidden="true">›</span>
    </span>
  </RouterLink>
</template>
