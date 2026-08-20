<script setup lang="ts">
import type { CatalogDto } from "@/api.js";

withDefaults(
  defineProps<{
    allLabel: string;
    hideLabel?: boolean;
    label: string;
    name: string;
    options: CatalogDto["categories"];
  }>(),
  { hideLabel: false },
);

const selected = defineModel<string>({ required: true });
</script>

<template>
  <fieldset>
    <legend
      :class="hideLabel ? 'sr-only' : 'mb-3 text-[.72rem] font-extrabold uppercase tracking-[.08em] text-muted'"
    >
      {{ label }}
    </legend>
    <ul class="space-y-2 text-[.86rem]">
      <li>
        <label class="flex cursor-pointer items-center gap-2.5 text-pine-deep">
          <input
            v-model="selected"
            type="radio"
            :name="name"
            value=""
            class="h-4 w-4 cursor-pointer border border-line bg-white text-pine focus-visible:ring-2 focus-visible:ring-pine"
          />
          <span>{{ allLabel }}</span>
        </label>
      </li>
      <li v-for="option in options" :key="option.name">
        <label class="flex cursor-pointer items-center gap-2.5 text-pine-deep">
          <input
            v-model="selected"
            type="radio"
            :name="name"
            :value="option.name"
            class="h-4 w-4 cursor-pointer border border-line bg-white text-pine focus-visible:ring-2 focus-visible:ring-pine"
          />
          <span>{{ option.name }} ({{ option.courseCount }})</span>
        </label>
      </li>
    </ul>
  </fieldset>
</template>
