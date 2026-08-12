import { readonly, ref } from "vue";

export type ToastKind = "error" | "info" | "success";

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  message: string;
}

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
  if (duration > 0)
    timers.set(
      id,
      setTimeout(() => dismiss(id), duration),
    );
  return id;
}

function clear(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  toasts.value = [];
}

export function useToast() {
  return {
    clear,
    dismiss,
    error: (message: string, duration?: number) => show(message, "error", duration),
    info: (message: string, duration?: number) => show(message, "info", duration),
    show,
    success: (message: string, duration?: number) => show(message, "success", duration),
    toasts: readonly(toasts),
  };
}
