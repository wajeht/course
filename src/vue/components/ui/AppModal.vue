<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";

import { useModalStack } from "../../composables/useModalStack.js";
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
const dialog = ref<HTMLDialogElement | null>(null);
const titleId = `modal-title-${useId()}`;
const modalStack = useModalStack();
let stackToken: symbol | null = null;
let restoreFocus: HTMLElement | null = null;

function requestClose(): void {
  emit("close");
}

function openDialog(): void {
  const element = dialog.value;
  if (!element || element.open) return;
  restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (typeof element.showModal === "function") element.showModal();
  else element.setAttribute("open", "");
  stackToken = modalStack.register(requestClose);
  void nextTick(() => element.querySelector<HTMLElement>("[autofocus]")?.focus());
}

function closeDialog(): void {
  const element = dialog.value;
  if (element?.open && typeof element.close === "function") element.close();
  else element?.removeAttribute("open");
  if (stackToken) modalStack.unregister(stackToken);
  stackToken = null;
  restoreFocus?.focus();
  restoreFocus = null;
}

function handleCancel(event: Event): void {
  event.preventDefault();
  if (!stackToken || modalStack.isTop(stackToken)) requestClose();
}

function handleBackdrop(event: MouseEvent): void {
  if (event.target === event.currentTarget) requestClose();
}

watch(
  () => props.open,
  (open) => {
    if (open) openDialog();
    else closeDialog();
  },
  { flush: "post" },
);
onMounted(() => {
  if (props.open) openDialog();
});
onBeforeUnmount(closeDialog);
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="m-auto max-h-[calc(100vh-40px)] w-[calc(100%-40px)] overflow-hidden rounded-[12px] border border-line bg-white p-0 text-ink shadow-[0_28px_90px_rgb(10_25_18_/_35%)] backdrop:bg-[#07110c]/65 backdrop:backdrop-blur-sm"
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
