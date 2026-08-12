<script setup lang="ts">
import { computed } from "vue";

import AppSelect from "./ui/AppSelect.vue";

interface FilterOption {
  name: string;
  courseCount: number;
}

const props = defineProps<{
  allLabel: string;
  label: string;
  modelValue: string;
  options: FilterOption[];
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const visibleOptions = computed(() => {
  if (!props.modelValue || props.options.some((option) => option.name === props.modelValue)) {
    return props.options;
  }
  return [{ name: props.modelValue, courseCount: 0 }, ...props.options];
});

const selected = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});
</script>

<template>
  <label
    class="relative flex min-h-10 w-[190px] items-center gap-2.5 rounded-[7px] border border-line bg-white px-3.5 shadow-[0_8px_30px_rgb(24_32_29_/_5%)] focus-within:border-pine focus-within:shadow-[0_0_0_3px_rgb(36_77_59_/_10%)] max-[700px]:w-full"
  >
    <slot />
    <span class="sr-only">Filter courses by {{ label.toLowerCase() }}</span>
    <AppSelect
      v-model="selected"
      class="w-full min-w-0 cursor-pointer appearance-none border-0 bg-transparent pr-5 text-[.78rem] font-semibold text-pine-deep outline-0"
      variant="bare"
      :aria-label="`Filter courses by ${label.toLowerCase()}`"
    >
      <option value="">{{ allLabel }}</option>
      <option v-for="option in visibleOptions" :key="option.name" :value="option.name">
        {{ option.name }} ({{ option.courseCount }})
      </option>
    </AppSelect>
    <svg
      class="pointer-events-none absolute right-3.5 w-3 fill-none stroke-pine stroke-2"
      viewBox="0 0 12 8"
      aria-hidden="true"
    >
      <path d="m1 1 5 5 5-5" />
    </svg>
  </label>
</template>
