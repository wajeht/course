<script setup lang="ts">
withDefaults(defineProps<{ variant?: "error" | "info" | "success" }>(), { variant: "error" });
</script>

<template>
  <div
    :class="[
      'rounded-[7px] border px-3 py-2 text-sm',
      variant === 'error' ? 'border-[#e8b7ae] bg-[#f8e5e1] text-[#6c241c]' : '',
      variant === 'success' ? 'border-pine/20 bg-mist text-pine-deep' : '',
      variant === 'info' ? 'border-line bg-white text-muted' : '',
    ]"
    :role="variant === 'error' ? 'alert' : 'status'"
  >
    <slot />
  </div>
</template>
