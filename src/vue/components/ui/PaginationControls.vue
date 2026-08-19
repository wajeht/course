<script setup lang="ts">
import { useIntentPrefetch } from "@/composables/useIntentPrefetch.js";
import AppButton from "./AppButton.vue";

const props = defineProps<{
  disabled?: boolean;
  page: number;
  totalPages: number;
}>();

const emit = defineEmits<{ change: [page: number]; prefetch: [page: number] }>();
const previousIntent = useIntentPrefetch(() => {
  if (!props.disabled && props.page > 1) emit("prefetch", props.page - 1);
});
const nextIntent = useIntentPrefetch(() => {
  if (!props.disabled && props.page < props.totalPages) emit("prefetch", props.page + 1);
});
</script>

<template>
  <nav v-if="totalPages > 1" class="mt-9 flex items-center justify-center gap-4" aria-label="Pages">
    <AppButton
      variant="secondary"
      :disabled="page <= 1 || disabled"
      @pointerenter="previousIntent.schedule"
      @pointerleave="previousIntent.cancel"
      @focus="previousIntent.run"
      @pointerdown="previousIntent.run"
      @click="$emit('change', page - 1)"
    >
      Previous
    </AppButton>
    <span class="text-[.8rem] font-semibold text-muted"> Page {{ page }} of {{ totalPages }} </span>
    <AppButton
      variant="secondary"
      :disabled="page >= totalPages || disabled"
      @pointerenter="nextIntent.schedule"
      @pointerleave="nextIntent.cancel"
      @focus="nextIntent.run"
      @pointerdown="nextIntent.run"
      @click="$emit('change', page + 1)"
    >
      Next
    </AppButton>
  </nav>
</template>
