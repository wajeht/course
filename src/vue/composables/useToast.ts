import { inject, readonly, ref, type InjectionKey, type Ref } from "vue";

export type ToastKind = "error" | "info" | "success";

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface ToastController {
  clear(): void;
  dismiss(id: number): void;
  error(message: string, duration?: number): number;
  info(message: string, duration?: number): number;
  show(message: string, kind?: ToastKind, duration?: number): number;
  success(message: string, duration?: number): number;
  toasts: Readonly<Ref<readonly ToastMessage[]>>;
}

export const toastKey: InjectionKey<ToastController> = Symbol("course-toast");

export function createToast(): ToastController {
  const toasts = ref<ToastMessage[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  let nextId = 1;

  function dismiss(id: number): void {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }

  function show(message: string, kind: ToastKind = "info", duration = 4_500): number {
    const id = nextId++;
    toasts.value.push({ id, kind, message });
    if (duration > 0) {
      timers.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
    }
    return id;
  }

  function clear(): void {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    toasts.value = [];
  }

  return {
    clear,
    dismiss,
    error: (message, duration) => show(message, "error", duration),
    info: (message, duration) => show(message, "info", duration),
    show,
    success: (message, duration) => show(message, "success", duration),
    toasts: readonly(toasts),
  };
}

export function useToast(): ToastController {
  const toast = inject(toastKey);
  if (!toast) throw new Error("Toast provider is not installed");
  return toast;
}
