import { getCurrentScope, onScopeDispose, readonly, shallowRef } from "vue";

export interface ConfirmationOptions {
  cancelLabel?: string;
  confirmLabel?: string;
  message: string;
  title: string;
  variant?: "danger" | "primary";
}

interface ConfirmationRequest extends Required<ConfirmationOptions> {
  owner: symbol;
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

function requestConfirmation(owner: symbol, options: ConfirmationOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const request: ConfirmationRequest = {
      cancelLabel: options.cancelLabel ?? "Cancel",
      confirmLabel: options.confirmLabel ?? "Confirm",
      message: options.message,
      owner,
      resolve,
      title: options.title,
      variant: options.variant ?? "primary",
    };
    if (active.value) queue.push(request);
    else active.value = request;
  });
}

function cancelOwner(owner: symbol): void {
  for (let index = queue.length - 1; index >= 0; index--) {
    const request = queue[index];
    if (request?.owner !== owner) continue;
    queue.splice(index, 1);
    request.resolve(false);
  }

  const request = active.value;
  if (request?.owner !== owner) return;
  active.value = null;
  request.resolve(false);
  showNext();
}

function clear(): void {
  if (active.value) active.value.resolve(false);
  for (const request of queue) request.resolve(false);
  queue.length = 0;
  active.value = null;
}

export function useConfirm() {
  const owner = Symbol("confirmation-owner");
  if (getCurrentScope()) onScopeDispose(() => cancelOwner(owner));

  return {
    accept: () => settle(true),
    active: readonly(active),
    cancel: () => settle(false),
    clear,
    confirm: (options: ConfirmationOptions) => requestConfirmation(owner, options),
  };
}
