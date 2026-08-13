import { computed, ref, shallowRef } from "vue";

interface AsyncActionOptions<TResult> {
  errorMessage?: string;
  onError?: (error: Error) => void;
  onSuccess?: (result: TResult) => void | Promise<void>;
}

export function useAsyncAction<TArguments extends unknown[], TResult>(
  action: (...arguments_: TArguments) => Promise<TResult>,
  options: AsyncActionOptions<TResult> = {},
) {
  const pending = ref(false);
  const error = shallowRef<unknown>(null);
  const errorMessage = computed(() => {
    if (!error.value) return "";
    return error.value instanceof Error
      ? error.value.message
      : (options.errorMessage ?? "Something went wrong");
  });

  function clearError(): void {
    error.value = null;
  }

  async function run(...arguments_: TArguments): Promise<TResult | undefined> {
    if (pending.value) return undefined;
    pending.value = true;
    error.value = null;
    try {
      const result = await action(...arguments_);
      await options.onSuccess?.(result);
      return result;
    } catch (caught) {
      const failure = caught instanceof Error ? caught : new Error("Something went wrong");
      error.value = caught;
      options.onError?.(failure);
      return undefined;
    } finally {
      pending.value = false;
    }
  }

  return { clearError, error, errorMessage, pending, run };
}
