<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    showText?: boolean;
    size?: "default" | "hero";
    textClass?: string;
  }>(),
  {
    showText: true,
    size: "default",
    textClass: "",
  },
);

const rootClasses = computed(() =>
  props.size === "hero"
    ? "gap-[clamp(18px,2vw,28px)] text-[clamp(2.8rem,4.5vw,4.8rem)] tracking-[.035em]"
    : "gap-3 text-2xl tracking-[.04em]",
);

const markClasses = computed(() =>
  props.size === "hero"
    ? "h-[clamp(46px,5vw,72px)] w-[clamp(76px,8vw,118px)] gap-[clamp(5px,.6vw,9px)] rounded-[6px] border-[clamp(3px,.35vw,5px)] px-[clamp(10px,1vw,16px)] py-[clamp(8px,.8vw,12px)]"
    : "h-[22px] w-9 gap-[3px] rounded-[3px] border-2 px-[5px] py-1",
);

const barClasses = computed(() => (props.size === "hero" ? "w-[clamp(8px,.8vw,13px)]" : "w-1"));
</script>

<template>
  <span :class="['inline-flex items-center font-display font-extrabold uppercase', rootClasses]">
    <span :class="['flex items-center border-current', markClasses]" aria-hidden="true">
      <i :class="['block h-full bg-belt-light', barClasses]" />
      <i :class="['block h-full bg-belt-light', barClasses]" />
      <i :class="['block h-full bg-belt-light', barClasses]" />
    </span>
    <span v-if="showText" :class="textClass">Course</span>
  </span>
</template>
