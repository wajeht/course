<script setup lang="ts">
import PanelCard from "./PanelCard.vue";

withDefaults(
  defineProps<{
    description?: string;
    headingLevel?: 1 | 2 | 3;
    title: string;
  }>(),
  { description: "", headingLevel: 3 },
);
</script>

<template>
  <PanelCard
    variant="subtle"
    class="grid min-h-80 place-items-center content-center p-10 text-center"
  >
    <div v-if="$slots.icon" class="mb-1.5 text-5xl text-belt" aria-hidden="true">
      <slot name="icon" />
    </div>
    <component :is="`h${headingLevel}`" class="mb-2 font-display font-bold">
      {{ title }}
    </component>
    <p v-if="description" class="max-w-[480px] text-muted">{{ description }}</p>
    <div v-if="$slots.details" class="mt-3 max-w-[480px] text-sm text-muted">
      <slot name="details" />
    </div>
    <div v-if="$slots.actions" class="mt-[22px] flex flex-wrap justify-center gap-2">
      <slot name="actions" />
    </div>
  </PanelCard>
</template>
