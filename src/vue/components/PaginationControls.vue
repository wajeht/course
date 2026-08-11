<script setup lang="ts">
defineProps<{
  disabled?: boolean;
  page: number;
  totalPages: number;
}>();

defineEmits<{ change: [page: number] }>();
</script>

<template>
  <nav v-if="totalPages > 1" class="mt-9 flex items-center justify-center gap-4" aria-label="Pages">
    <button
      class="min-h-10 rounded-[7px] border border-line bg-white px-4 text-[.78rem] font-[750] text-pine disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="page <= 1 || disabled"
      @click="$emit('change', page - 1)"
    >
      Previous
    </button>
    <span class="text-[.8rem] font-semibold text-muted"> Page {{ page }} of {{ totalPages }} </span>
    <button
      class="min-h-10 rounded-[7px] border border-line bg-white px-4 text-[.78rem] font-[750] text-pine disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="page >= totalPages || disabled"
      @click="$emit('change', page + 1)"
    >
      Next
    </button>
  </nav>
</template>
