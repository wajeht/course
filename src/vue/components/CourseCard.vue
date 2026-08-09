<script setup lang="ts">
import { RouterLink } from "vue-router";

import type { CatalogDto } from "../api";
import { durationText } from "../utils/format";
import ProgressBar from "./ProgressBar.vue";

defineProps<{ course: CatalogDto["courses"][number] }>();
</script>

<template>
  <RouterLink :to="{ name: 'course', params: { courseId: course.id } }" class="course-card group">
    <div class="course-card__cover">
      <img
        v-if="course.coverUrl"
        :src="course.coverUrl"
        :alt="`${course.title} cover`"
        loading="lazy"
      />
      <div v-else class="course-card__fallback" aria-hidden="true">COURSE</div>
      <div class="course-card__count">{{ course.lessonCount }} lessons</div>
    </div>
    <div class="course-card__body">
      <h3>{{ course.title }}</h3>
      <p>{{ durationText(course.durationSeconds) }}</p>
      <div class="course-card__progress">
        <ProgressBar :value="course.progressPercent" compact />
        <span>{{ course.progressPercent }}%</span>
      </div>
    </div>
  </RouterLink>
</template>
