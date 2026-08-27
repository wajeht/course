<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: "default" | "lg";
    variant?: "error" | "info" | "success";
  }>(),
  { size: "default", variant: "error" },
);
</script>

<template>
  <div
    :class="[
      'rounded-[7px] border',
      size === 'lg' ? 'px-[18px] py-[14px] text-[.88rem]' : 'px-3 py-2 text-sm',
      variant === 'error' ? 'border-[#e3b7b5] bg-[#f8e9e8] text-[#732c2a]' : '',
      variant === 'success' ? 'border-pine/20 bg-mist text-pine-deep' : '',
      variant === 'info' ? 'border-line bg-white text-muted' : '',
    ]"
    :role="variant === 'error' ? 'alert' : 'status'"
  >
    <slot />
  </div>
</template>
