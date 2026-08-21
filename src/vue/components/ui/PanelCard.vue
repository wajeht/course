<script setup lang="ts">
import { computed } from "vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    as?: string;
    elevated?: boolean;
    padding?: "compact" | "default" | "none";
    variant?: "default" | "subtle";
  }>(),
  { as: "section", elevated: true, padding: "default", variant: "default" },
);

const paddingClasses = computed(
  () =>
    ({
      compact: "p-5",
      default: "p-[clamp(22px,4vw,34px)]",
      none: "",
    })[props.padding],
);
const surfaceClasses = computed(() => {
  if (props.variant === "subtle") return "border-dashed border-[#bfc8c2] bg-white/55";
  return ["border-line bg-white", props.elevated ? "shadow-course" : ""];
});
</script>

<template>
  <component
    :is="as"
    v-bind="$attrs"
    :class="['overflow-hidden rounded-[10px] border', surfaceClasses, paddingClasses]"
  >
    <slot />
  </component>
</template>
