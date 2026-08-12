<script setup lang="ts">
import { useConfirm } from "@/composables/useConfirm.js";
import AppButton from "./AppButton.vue";
import AppModal from "./AppModal.vue";

const confirmation = useConfirm();
</script>

<template>
  <AppModal
    :open="Boolean(confirmation.active.value)"
    :title="confirmation.active.value?.title ?? 'Confirm action'"
    size="sm"
    @close="confirmation.cancel"
  >
    <p class="leading-6 text-muted">{{ confirmation.active.value?.message }}</p>
    <template #footer>
      <AppButton variant="secondary" autofocus @click="confirmation.cancel">
        {{ confirmation.active.value?.cancelLabel }}
      </AppButton>
      <AppButton
        :variant="confirmation.active.value?.variant === 'danger' ? 'danger' : 'primary'"
        @click="confirmation.accept"
      >
        {{ confirmation.active.value?.confirmLabel }}
      </AppButton>
    </template>
  </AppModal>
</template>
