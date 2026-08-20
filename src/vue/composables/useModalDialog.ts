import { nextTick, onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";

import { useModalStack } from "@/composables/useModalStack.js";

export function useModalDialog(open: () => boolean, requestClose: () => void) {
  const dialog = useTemplateRef<HTMLDialogElement>("dialog");
  const modalStack = useModalStack();
  let stackToken: symbol | null = null;
  let restoreFocus: HTMLElement | null = null;

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
    open,
    (isOpen) => {
      if (isOpen) openDialog();
      else closeDialog();
    },
    { flush: "post" },
  );
  onMounted(() => {
    if (open()) openDialog();
  });
  onBeforeUnmount(closeDialog);

  return { dialog, handleBackdrop, handleCancel };
}
