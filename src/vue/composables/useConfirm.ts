import {
  getCurrentScope,
  inject,
  onScopeDispose,
  readonly,
  shallowRef,
  type InjectionKey,
} from "vue";

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

export interface ConfirmationController {
  accept(): void;
  active: Readonly<ReturnType<typeof shallowRef<ConfirmationRequest | null>>>;
  cancel(): void;
  cancelOwner(owner: symbol): void;
  clear(): void;
  request(owner: symbol, options: ConfirmationOptions): Promise<boolean>;
}

export interface Confirmation {
  accept(): void;
  active: ConfirmationController["active"];
  cancel(): void;
  clear(): void;
  confirm(options: ConfirmationOptions): Promise<boolean>;
}

export const confirmationKey: InjectionKey<ConfirmationController> = Symbol("course-confirmation");

export function createConfirmation(): ConfirmationController {
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

  function request(owner: symbol, options: ConfirmationOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmation: ConfirmationRequest = {
        cancelLabel: options.cancelLabel ?? "Cancel",
        confirmLabel: options.confirmLabel ?? "Confirm",
        message: options.message,
        owner,
        resolve,
        title: options.title,
        variant: options.variant ?? "primary",
      };
      if (active.value) queue.push(confirmation);
      else active.value = confirmation;
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

  return {
    accept: () => settle(true),
    active: readonly(active),
    cancel: () => settle(false),
    cancelOwner,
    clear,
    request,
  };
}

export function useConfirm(): Confirmation {
  const confirmation = inject(confirmationKey);
  if (!confirmation) throw new Error("Confirmation provider is not installed");
  const owner = Symbol("confirmation-owner");
  if (getCurrentScope()) onScopeDispose(() => confirmation.cancelOwner(owner));

  return {
    accept: confirmation.accept,
    active: confirmation.active,
    cancel: confirmation.cancel,
    clear: confirmation.clear,
    confirm: (options) => confirmation.request(owner, options),
  };
}
