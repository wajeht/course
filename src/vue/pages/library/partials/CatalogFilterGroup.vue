<script setup lang="ts">
import { computed } from "vue";

import type { CatalogDto } from "@/api.js";

const props = withDefaults(
  defineProps<{
    allLabel: string;
    hideLabel?: boolean;
    label: string;
    name: string;
    options: CatalogDto["categories"];
  }>(),
  { hideLabel: false },
);

const selected = defineModel<string[]>({ required: true });
const visibleOptions = computed(() => {
  const missingSelections = selected.value
    .filter((name) => !props.options.some((option) => option.name === name))
    .map((name) => ({ name, courseCount: 0 }));
  return [...missingSelections, ...props.options];
});
</script>

<template>
  <fieldset>
    <legend
      :class="hideLabel ? 'sr-only' : 'mb-3 text-[.72rem] font-extrabold uppercase tracking-[.08em] text-muted'"
    >
      {{ label }}
    </legend>
    <p v-if="!visibleOptions.length" class="text-[.82rem] text-muted">{{ allLabel }}</p>
    <ul v-else class="space-y-2 text-[.86rem]">
      <li v-for="option in visibleOptions" :key="option.name">
        <label class="flex cursor-pointer items-center gap-2.5 text-pine-deep">
          <input
            v-model="selected"
            type="checkbox"
            :name="name"
            :value="option.name"
            class="h-4 w-4 cursor-pointer rounded-[3px] border border-line bg-white text-pine focus-visible:ring-2 focus-visible:ring-pine"
          />
          <span>{{ option.name }} ({{ option.courseCount }})</span>
        </label>
      </li>
    </ul>
  </fieldset>
</template>
