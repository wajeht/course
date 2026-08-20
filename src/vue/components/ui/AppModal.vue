<script setup lang="ts">
import { useId } from "vue";

import { useModalDialog } from "@/composables/useModalDialog.js";
import AppButton from "./AppButton.vue";

const props = withDefaults(
  defineProps<{
    closeLabel?: string;
    open: boolean;
    size?: "lg" | "md" | "sm";
    title: string;
  }>(),
  { closeLabel: "Close dialog", size: "md" },
);

const emit = defineEmits<{ close: [] }>();
const titleId = `modal-title-${useId()}`;

function requestClose(): void {
  emit("close");
}

const { handleBackdrop, handleCancel } = useModalDialog(() => props.open, requestClose);
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="m-auto max-h-[calc(100vh-40px)] w-[calc(100%-40px)] overflow-hidden rounded-[12px] border border-line bg-white p-0 text-ink shadow-[0_28px_90px_rgb(10_25_18_/_35%)] backdrop:bg-[#07110c]/40"
      :class="{ sm: 'max-w-[430px]', md: 'max-w-[600px]', lg: 'max-w-[850px]' }[size]"
      :aria-labelledby="titleId"
      @cancel="handleCancel"
      @click="handleBackdrop"
    >
      <section @click.stop>
        <header class="flex items-start justify-between gap-5 border-b border-line px-6 py-5">
          <h2 :id="titleId" class="font-display text-2xl font-extrabold">{{ title }}</h2>
          <AppButton
            variant="unstyled"
            class="grid h-9 w-9 place-items-center rounded-full text-2xl text-muted hover:bg-mist hover:text-ink"
            :aria-label="closeLabel"
            @click="requestClose"
          >
            ×
          </AppButton>
        </header>
        <div class="max-h-[calc(100vh-220px)] overflow-y-auto px-6 py-5">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="flex justify-end gap-2 border-t border-line px-6 py-4">
          <slot name="footer" />
        </footer>
      </section>
    </dialog>
  </Teleport>
</template>
