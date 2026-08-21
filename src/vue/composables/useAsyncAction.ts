import { computed, shallowRef } from "vue";

import { apiErrorMessage } from "@/api.js";

interface AsyncActionOptions<TResult> {
  errorMessage?: string;
  onError?: (error: unknown) => void;
  onSuccess?: (result: TResult) => void | Promise<void>;
}

export function useAsyncAction<TArguments extends unknown[], TResult>(
  action: (...arguments_: TArguments) => Promise<TResult>,
  options: AsyncActionOptions<TResult> = {},
) {
  const pending = shallowRef(false);
  const error = shallowRef<unknown>(null);
  const errorMessage = computed(() => {
    if (!error.value) return "";
    return apiErrorMessage(error.value, options.errorMessage ?? "Something went wrong");
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
      error.value = caught;
      options.onError?.(caught);
      return undefined;
    } finally {
      pending.value = false;
    }
  }

  return { clearError, error, errorMessage, pending, run };
}
