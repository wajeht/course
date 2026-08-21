<script setup lang="ts">
import { computed, type DeepReadonly } from "vue";

import type { CatalogDto } from "@/api.js";
import CourseCard from "@/components/CourseCard.vue";

const props = withDefaults(
  defineProps<{
    courses: DeepReadonly<CatalogDto["courses"]>;
    elevated?: boolean;
    layout?: "page" | "sidebar";
    loading?: boolean;
  }>(),
  { elevated: true, layout: "page", loading: false },
);

const columnClasses = computed(() =>
  props.layout === "sidebar"
    ? "grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] min-[601px]:grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))]"
    : "grid-cols-4 max-[1120px]:grid-cols-3 max-[860px]:grid-cols-2 max-[600px]:grid-cols-1",
);
</script>

<template>
  <div
    v-if="loading"
    class="grid gap-[clamp(18px,2vw,30px)]"
    :class="columnClasses"
    aria-label="Loading courses"
    role="status"
  >
    <div
      v-for="index in 4"
      :key="index"
      class="min-h-[420px] animate-pulse rounded-[10px] bg-[#e9ece8]"
    />
  </div>
  <div v-else class="grid gap-[clamp(18px,2vw,30px)]" :class="columnClasses">
    <CourseCard v-for="course in courses" :key="course.id" :course="course" :elevated />
  </div>
</template>
