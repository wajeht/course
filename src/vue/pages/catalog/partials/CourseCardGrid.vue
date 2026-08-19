<script setup lang="ts">
import type { CatalogDto } from "@/api.js";
import CourseCard from "@/components/CourseCard.vue";

withDefaults(
  defineProps<{
    courses: CatalogDto["courses"];
    loading?: boolean;
  }>(),
  { loading: false },
);
</script>

<template>
  <div
    v-if="loading"
    class="grid grid-cols-4 gap-[clamp(18px,2vw,30px)] max-[1120px]:grid-cols-3 max-[860px]:grid-cols-2 max-[600px]:grid-cols-1"
    aria-label="Loading courses"
  >
    <div
      v-for="index in 4"
      :key="index"
      class="min-h-[420px] animate-pulse rounded-[10px] bg-[#e9ece8]"
    />
  </div>
  <div
    v-else
    class="grid grid-cols-4 gap-[clamp(18px,2vw,30px)] max-[1120px]:grid-cols-3 max-[860px]:grid-cols-2 max-[600px]:grid-cols-1"
  >
    <CourseCard v-for="course in courses" :key="course.id" :course="course" />
  </div>
</template>
