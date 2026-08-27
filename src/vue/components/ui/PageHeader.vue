<script setup lang="ts">
withDefaults(
  defineProps<{
    description?: string;
    eyebrow?: string;
    headingLevel?: 1 | 2;
    title: string;
  }>(),
  { description: undefined, headingLevel: 1 },
);
</script>

<template>
  <header
    class="flex items-end justify-between gap-6 max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-2"
  >
    <div>
      <p
        v-if="eyebrow"
        class="mb-[9px] font-mono text-[.66rem] font-extrabold tracking-[.16em] text-belt-ink uppercase"
      >
        {{ eyebrow }}
      </p>
      <component
        :is="`h${headingLevel}`"
        class="font-display text-[clamp(2rem,3.2vw,3rem)] leading-[.96] font-black tracking-[-.035em] uppercase"
      >
        {{ title }}
      </component>
      <p v-if="description" class="mt-3 max-w-[600px] text-[.92rem] leading-6 text-muted">
        {{ description }}
      </p>
    </div>
    <slot name="aside" />
  </header>
</template>
