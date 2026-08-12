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
      variant === 'error' ? 'border-[#e8b7ae] bg-[#f8e5e1] text-[#6c241c]' : '',
      variant === 'success' ? 'border-pine/20 bg-mist text-pine-deep' : '',
      variant === 'info' ? 'border-line bg-white text-muted' : '',
    ]"
    :role="variant === 'error' ? 'alert' : 'status'"
  >
    <slot />
  </div>
</template>
