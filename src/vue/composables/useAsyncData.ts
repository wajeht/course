import { onScopeDispose, ref, shallowRef } from "vue";

interface AsyncDataOptions {
  immediate?: boolean;
}

interface FetchContext {
  signal: AbortSignal;
}

export function useAsyncData<T>(
  fetcher: (context: FetchContext) => Promise<T>,
  { immediate = true }: AsyncDataOptions = {},
) {
  const data = shallowRef<T | null>(null);
  const error = shallowRef<unknown>(null);
  const loading = ref(false);
  let controller: AbortController | null = null;

  function abort(): void {
    controller?.abort();
    controller = null;
    loading.value = false;
  }

  async function refresh(): Promise<T | undefined> {
    abort();
    const requestController = new AbortController();
    controller = requestController;
    loading.value = true;
    error.value = null;

    try {
      const result = await fetcher({ signal: requestController.signal });
      if (controller === requestController) data.value = result;
      return result;
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      if (controller === requestController) error.value = caught;
      throw caught;
    } finally {
      if (controller === requestController) {
        controller = null;
        loading.value = false;
      }
    }
  }

  onScopeDispose(abort);

  if (immediate) void refresh().catch(() => undefined);

  return { abort, data, error, loading, refresh };
}
