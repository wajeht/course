import { effectScope } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useAsyncData } from "./useAsyncData.js";

describe("useAsyncData", () => {
  it("retains data and ignores a superseded response", async () => {
    const requests: Array<{
      resolve: (value: string) => void;
      signal: AbortSignal;
    }> = [];
    const fetcher = vi.fn(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise<string>((resolve) => requests.push({ resolve, signal })),
    );
    const scope = effectScope();
    const state = scope.run(() => useAsyncData(fetcher, { immediate: false }));
    if (!state) throw new Error("Composable did not initialize");

    const initialRequest = state.refresh();
    requests[0]?.resolve("Old result");
    await initialRequest;

    const supersededRequest = state.refresh();
    const latestRequest = state.refresh();
    expect(requests[1]?.signal.aborted).toBe(true);
    expect(state.data.value).toBe("Old result");
    expect(state.loading.value).toBe(true);

    requests[1]?.resolve("Stale result");
    await supersededRequest;
    expect(state.data.value).toBe("Old result");
    expect(state.loading.value).toBe(true);

    requests[2]?.resolve("New result");
    await latestRequest;
    expect(state.data.value).toBe("New result");
    expect(state.loading.value).toBe(false);

    scope.stop();
  });
});
