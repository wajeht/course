import { reactive, readonly } from "vue";

const state = reactive({
  retryPath: "/",
  visible: false,
});

export const frontendError = readonly(state);

export function clearFrontendError(): void {
  state.visible = false;
}

export function showFrontendError(error: unknown, retryPath: string, context?: string): void {
  console.error("Unexpected frontend error", { context, error });
  state.retryPath = retryPath;
  state.visible = true;
}

export function retryFrontend(): void {
  window.location.assign(state.retryPath);
}
