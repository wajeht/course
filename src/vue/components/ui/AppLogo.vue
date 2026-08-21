<script setup lang="ts">
withDefaults(defineProps<{ showText?: boolean; textClass?: string }>(), {
  showText: true,
  textClass: "",
});
</script>

<template>
  <span
    class="inline-flex items-center gap-3 font-display text-2xl font-extrabold tracking-[.04em] uppercase"
  >
    <span
      class="flex h-[22px] w-9 items-center gap-[3px] rounded-[3px] border-2 border-current px-[5px] py-1"
      aria-hidden="true"
    >
      <i class="block h-full w-1 bg-belt-light" />
      <i class="block h-full w-1 bg-belt-light" />
      <i class="block h-full w-1 bg-belt-light" />
    </span>
    <span v-if="showText" :class="textClass">Videos</span>
  </span>
</template>
