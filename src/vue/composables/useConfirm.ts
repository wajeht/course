import { readonly, shallowRef } from "vue";

export interface ConfirmationOptions {
  cancelLabel?: string;
  confirmLabel?: string;
  message: string;
  title: string;
  variant?: "danger" | "primary";
}

interface ConfirmationRequest extends Required<ConfirmationOptions> {
  resolve: (confirmed: boolean) => void;
}

const active = shallowRef<ConfirmationRequest | null>(null);
const queue: ConfirmationRequest[] = [];

function showNext(): void {
  active.value = queue.shift() ?? null;
}

function settle(confirmed: boolean): void {
  const request = active.value;
  if (!request) return;
  active.value = null;
  request.resolve(confirmed);
  showNext();
}

function confirm(options: ConfirmationOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const request: ConfirmationRequest = {
      cancelLabel: options.cancelLabel ?? "Cancel",
      confirmLabel: options.confirmLabel ?? "Confirm",
      message: options.message,
      resolve,
      title: options.title,
      variant: options.variant ?? "primary",
    };
    if (active.value) queue.push(request);
    else active.value = request;
  });
}

function clear(): void {
  if (active.value) active.value.resolve(false);
  for (const request of queue) request.resolve(false);
  queue.length = 0;
  active.value = null;
}

export function useConfirm() {
  return {
    accept: () => settle(true),
    active: readonly(active),
    cancel: () => settle(false),
    clear,
    confirm,
  };
}
