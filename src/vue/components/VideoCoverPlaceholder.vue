<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ title: string }>();
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
    class="grid place-items-center bg-pine bg-[linear-gradient(135deg,transparent_49%,rgb(255_255_255_/_12%)_50%,transparent_51%)] bg-[length:30px_30px] font-display text-[clamp(2rem,4vw,3.75rem)] font-black tracking-[.12em] text-white/65"
    aria-hidden="true"
  >
    {{ initials }}
  </div>
</template>
