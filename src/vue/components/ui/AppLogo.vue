<script setup lang="ts">
withDefaults(defineProps<{ showText?: boolean; textClass?: string }>(), {
  showText: true,
  textClass: "",
});
</script>

<template>
  <span
    class="inline-flex items-center gap-3 font-display text-2xl font-black tracking-[.06em] uppercase"
  >
    <span
      class="relative grid h-6 w-9 place-items-center rounded-[2px] border-2 border-current"
      aria-hidden="true"
    >
      <i class="absolute top-[2px] left-[3px] h-[3px] w-[5px] bg-belt-light" />
      <i class="absolute top-[2px] right-[3px] h-[3px] w-[5px] bg-belt-light" />
      <i class="absolute bottom-[2px] left-[3px] h-[3px] w-[5px] bg-belt-light" />
      <i class="absolute right-[3px] bottom-[2px] h-[3px] w-[5px] bg-belt-light" />
      <i
        class="ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-current"
      />
    </span>
    <span v-if="showText" :class="textClass">Videos</span>
  </span>
</template>
