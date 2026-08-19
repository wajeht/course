import { effectScope } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useIntentPrefetch } from "./useIntentPrefetch.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("useIntentPrefetch", () => {
  it("waits for sustained pointer intent", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const scope = effectScope();
    const intent = scope.run(() => useIntentPrefetch(() => calls++, 80))!;

    intent.schedule();
    await vi.advanceTimersByTimeAsync(79);
    expect(calls).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toBe(1);
    scope.stop();
  });

  it("cancels incidental hover and runs immediately for focus or pointer down", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const scope = effectScope();
    const intent = scope.run(() => useIntentPrefetch(() => calls++, 80))!;

    intent.schedule();
    intent.cancel();
    await vi.advanceTimersByTimeAsync(80);
    expect(calls).toBe(0);

    intent.run();
    expect(calls).toBe(1);
    scope.stop();
  });
});
