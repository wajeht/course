<script setup lang="ts">
withDefaults(
  defineProps<{
    value: number;
    label?: string;
    compact?: boolean;
    light?: boolean;
  }>(),
  { label: "Playlist progress", compact: false, light: false },
);
</script>

<template>
  <div>
    <div
      class="relative overflow-hidden rounded-[2px]"
      :class="[compact ? 'h-1.5' : 'h-[9px]', light ? 'bg-white/18' : 'bg-[#cdd4cf]']"
    >
      <span
        class="absolute inset-y-0 left-0 bg-linear-to-r from-belt to-belt-light transition-[width] duration-[350ms]"
        :style="{ width: `${Math.min(100, Math.max(0, value))}%` }"
      />
      <span
        v-for="stripe in 4"
        :key="stripe"
        class="absolute top-0 z-[2] h-full w-0.5 bg-white/55"
        :style="{ left: `${stripe * 20}%` }"
      />
    </div>
    <span class="sr-only">{{ label }}: {{ value }}%</span>
  </div>
</template>
