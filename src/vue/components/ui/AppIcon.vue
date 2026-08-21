<script setup lang="ts">
type AppIconName = "alert-circle" | "chevron-right" | "heart" | "library" | "play";

defineProps<{ name: AppIconName }>();

const iconPaths: Record<AppIconName, readonly string[]> = {
  "alert-circle": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 8v4", "M12 16h.01"],
  "chevron-right": ["m9 18 6-6-6-6"],
  heart: [
    "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  ],
  library: [
    "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2V3z",
    "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7V3z",
  ],
  play: ["m8 5 11 7-11 7V5z"],
};
</script>

<template>
  <svg
    :data-icon="name"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="path in iconPaths[name]" :key="path" :d="path" />
  </svg>
</template>
