<script setup lang="ts">
import { computed, shallowRef } from "vue";

import type { CatalogDto } from "@/api.js";
import AppButton from "@/components/ui/AppButton.vue";

const props = withDefaults(
  defineProps<{
    allLabel: string;
    collapsedLimit?: number;
    hideLabel?: boolean;
    label: string;
    name: string;
    options: CatalogDto["categories"];
  }>(),
  { hideLabel: false },
);

const selected = defineModel<string[]>({ required: true });
const expanded = shallowRef(false);
const allOptions = computed(() => {
  const missingSelections = selected.value
    .filter((name) => !props.options.some((option) => option.name === name))
    .map((name) => ({ name, courseCount: 0 }));
  return [...missingSelections, ...props.options];
});
const hasOverflow = computed(
  () => props.collapsedLimit !== undefined && allOptions.value.length > props.collapsedLimit,
);
const visibleOptions = computed(() => {
  if (!hasOverflow.value || expanded.value || props.collapsedLimit === undefined) {
    return allOptions.value;
  }
  const initialOptions = allOptions.value.slice(0, props.collapsedLimit);
  const selectedOptions = allOptions.value.filter((option) => selected.value.includes(option.name));
  return [
    ...new Map(
      [...initialOptions, ...selectedOptions].map((option) => [option.name, option]),
    ).values(),
  ];
});
</script>

<template>
  <fieldset>
    <legend
      :class="
        hideLabel
          ? 'sr-only'
          : 'mb-3 text-[.72rem] font-extrabold uppercase tracking-[.08em] text-pine'
      "
    >
      {{ label }}
    </legend>
    <p v-if="!visibleOptions.length" class="text-[.82rem] text-muted">{{ allLabel }}</p>
    <ul v-else class="space-y-2 text-[.86rem]">
      <li v-for="option in visibleOptions" :key="option.name">
        <label class="flex cursor-pointer items-center gap-2.5 text-pine-deep max-[760px]:min-h-11">
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
    <AppButton
      v-if="hasOverflow"
      variant="unstyled"
      class="mt-3 inline-flex min-h-10 items-center text-[.75rem] font-bold text-pine underline decoration-pine/25 underline-offset-[3px] hover:decoration-pine"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      {{
        expanded
          ? `Show fewer ${label.toLowerCase()}`
          : `Show all ${allOptions.length} ${label.toLowerCase()}`
      }}
    </AppButton>
  </fieldset>
</template>
