<script setup lang="ts">
import AppButton from "./ui/AppButton.vue";

defineProps<{
  disabled?: boolean;
  page: number;
  totalPages: number;
}>();

defineEmits<{ change: [page: number] }>();
</script>

<template>
  <nav v-if="totalPages > 1" class="mt-9 flex items-center justify-center gap-4" aria-label="Pages">
    <AppButton
      variant="secondary"
      :disabled="page <= 1 || disabled"
      @click="$emit('change', page - 1)"
    >
      Previous
    </AppButton>
    <span class="text-[.8rem] font-semibold text-muted"> Page {{ page }} of {{ totalPages }} </span>
    <AppButton
      variant="secondary"
      :disabled="page >= totalPages || disabled"
      @click="$emit('change', page + 1)"
    >
      Next
    </AppButton>
  </nav>
</template>
