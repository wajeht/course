import { effectScope } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useIntentPrefetch } from "./useIntentPrefetch.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("useIntentPrefetch", () => {
  it("waits for sustained pointer intent", async () => {
    vi.useFakeTimers();
    const action = vi.fn();
    const scope = effectScope();
    const intent = scope.run(() => useIntentPrefetch(action, 80))!;

    intent.schedule();
    await vi.advanceTimersByTimeAsync(79);
    expect(action).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(action).toHaveBeenCalledOnce();
    scope.stop();
  });

  it("cancels incidental hover and runs immediately for focus or pointer down", async () => {
    vi.useFakeTimers();
    const action = vi.fn();
    const scope = effectScope();
    const intent = scope.run(() => useIntentPrefetch(action, 80))!;

    intent.schedule();
    intent.cancel();
    await vi.advanceTimersByTimeAsync(80);
    expect(action).not.toHaveBeenCalled();

    intent.run();
    expect(action).toHaveBeenCalledOnce();
    scope.stop();
  });
});
