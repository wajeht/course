<script setup lang="ts">
import { computed } from "vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    as?: string;
    padding?: "compact" | "default" | "none";
    variant?: "default" | "subtle";
  }>(),
  { as: "section", padding: "default", variant: "default" },
);

const paddingClasses = computed(
  () =>
    ({
      compact: "p-5",
      default: "p-[clamp(22px,4vw,34px)]",
      none: "",
    })[props.padding],
);
</script>

<template>
  <component
    :is="as"
    v-bind="$attrs"
    :class="[
      'overflow-hidden rounded-[10px] border',
      variant === 'default'
        ? 'border-line bg-white shadow-course'
        : 'border-dashed border-[#bfc8c2] bg-white/55',
      paddingClasses,
    ]"
  >
    <slot />
  </component>
</template>
