<script setup lang="ts">
withDefaults(
  defineProps<{
    value: number;
    label?: string;
    compact?: boolean;
  }>(),
  { label: "Course progress", compact: false },
);
</script>

<template>
  <div class="progress-wrap">
    <div class="progress-track" :class="{ 'progress-track--compact': compact }">
      <span class="progress-fill" :style="{ width: `${Math.min(100, Math.max(0, value))}%` }" />
      <span
        v-for="stripe in 4"
        :key="stripe"
        class="progress-stripe"
        :style="{ left: `${stripe * 20}%` }"
      />
    </div>
    <span class="sr-only">{{ label }}: {{ value }}%</span>
  </div>
</template>
