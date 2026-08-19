import { onScopeDispose } from "vue";

export function useIntentPrefetch(action: () => void, delayMilliseconds = 80) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  function cancel(): void {
    clearTimeout(timer);
    timer = undefined;
  }

  function run(): void {
    cancel();
    action();
  }

  function schedule(): void {
    cancel();
    timer = setTimeout(run, delayMilliseconds);
  }

  onScopeDispose(cancel);

  return { cancel, run, schedule };
}
