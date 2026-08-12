<script setup lang="ts">
withDefaults(
  defineProps<{
    description?: string;
    eyebrow: string;
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
      <p class="mb-[9px] text-[.68rem] font-extrabold tracking-[.18em] text-belt uppercase">
        {{ eyebrow }}
      </p>
      <component
        :is="`h${headingLevel}`"
        class="font-display text-[clamp(1.9rem,3vw,2.7rem)] font-[750] tracking-[-.035em]"
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
