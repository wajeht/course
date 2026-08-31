<script setup lang="ts">
const props = defineProps<{ enabled: boolean }>();
const emit = defineEmits<{ change: [enabled: boolean] }>();
</script>

<template>
  <button
    type="button"
    role="switch"
    aria-label="Autoplay next"
    :aria-checked="enabled"
    class="flex min-h-11 w-full items-center justify-between gap-4 rounded-[5px] border border-line bg-white px-3 py-2 text-left transition-[border-color,background-color] duration-150 hover:border-pine/45 hover:bg-mist/45"
    @click="emit('change', !props.enabled)"
  >
    <span>
      <span class="block text-xs font-bold text-pine">Autoplay next</span>
      <span class="mt-0.5 block text-[.68rem] font-semibold tracking-[.08em] text-muted uppercase">
        {{ enabled ? "On" : "Off" }}
      </span>
    </span>
    <span
      aria-hidden="true"
      class="relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-150"
      :class="enabled ? 'border-belt-ink bg-belt' : 'border-line bg-mist'"
    >
      <span
        class="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-150"
        :class="enabled ? 'left-[22px]' : 'left-[3px]'"
      />
    </span>
  </button>
</template>
