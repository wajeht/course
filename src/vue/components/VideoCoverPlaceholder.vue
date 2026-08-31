<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{ compact?: boolean; title: string }>(), {
  compact: false,
});
const initials = computed(() => {
  const words = props.title.trim().split(/\s+/).filter(Boolean);
  return (
    words
      .slice(0, 2)
      .map((word) => [...word][0])
      .join("")
      .toUpperCase() || "V"
  );
});
</script>

<template>
  <div
    class="grid place-items-center bg-pine bg-[linear-gradient(135deg,transparent_49%,rgb(255_255_255_/_12%)_50%,transparent_51%)] bg-[length:30px_30px] font-display font-black tracking-[.12em] text-white/65"
    :class="compact ? 'text-base' : 'text-[clamp(2rem,4vw,3.75rem)]'"
    aria-hidden="true"
  >
    {{ initials }}
  </div>
</template>
