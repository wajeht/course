<script setup lang="ts">
import { computed, shallowRef } from "vue";
import type { LibraryDto } from "@/api.js";
import AppButton from "@/components/ui/AppButton.vue";

const props = withDefaults(
  defineProps<{
    allLabel: string;
    collapsedLimit?: number;
    label: string;
    name: string;
    options: LibraryDto["authors"];
  }>(),
  { collapsedLimit: 10 },
);
const selected = defineModel<string[]>({ required: true });
const expanded = shallowRef(false);
const allOptions = computed(() => {
  const missing = selected.value
    .filter((name) => !props.options.some((option) => option.name === name))
    .map((name) => ({ name, videoCount: 0 }));
  return [...missing, ...props.options];
});
const visible = computed(() =>
  expanded.value ? allOptions.value : allOptions.value.slice(0, props.collapsedLimit),
);
</script>

<template>
  <fieldset>
    <legend class="mb-3 text-[.72rem] font-extrabold tracking-[.08em] text-pine uppercase">
      {{ label }}
    </legend>
    <p v-if="!visible.length" class="text-[.82rem] text-muted">{{ allLabel }}</p>
    <ul v-else class="space-y-2 text-[.86rem]">
      <li v-for="option in visible" :key="option.name">
        <label class="flex cursor-pointer items-center gap-2.5 text-pine-deep">
          <input
            v-model="selected"
            type="checkbox"
            :name="name"
            :value="option.name"
            class="h-4 w-4 rounded border-line text-pine focus-visible:ring-pine"
          />
          <span>{{ option.name }} ({{ option.videoCount }})</span>
        </label>
      </li>
    </ul>
    <AppButton
      v-if="allOptions.length > collapsedLimit"
      variant="unstyled"
      class="mt-3 text-[.75rem] font-bold text-pine underline"
      @click="expanded = !expanded"
    >
      {{ expanded ? "Show fewer" : `Show all ${allOptions.length}` }}
    </AppButton>
  </fieldset>
</template>
