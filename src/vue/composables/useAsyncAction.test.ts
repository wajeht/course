import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api.js";

import { useAsyncAction } from "./useAsyncAction.js";

describe("useAsyncAction", () => {
  it("tracks pending state and prevents duplicate submissions", async () => {
    let resolve: ((value: string) => void) | undefined;
    const action = vi.fn(
      () =>
        new Promise<string>((resolveAction) => {
          resolve = resolveAction;
        }),
    );
    const state = useAsyncAction(action);

    const firstRun = state.run();
    expect(state.pending.value).toBe(true);
    await expect(state.run()).resolves.toBeUndefined();
    expect(action).toHaveBeenCalledTimes(1);

    resolve?.("done");
    await expect(firstRun).resolves.toBe("done");
    expect(state.pending.value).toBe(false);
  });

  it("captures errors, uses a fallback message, and clears stale errors", async () => {
    const action = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce("failed")
      .mockResolvedValueOnce("recovered");
    const onSuccess = vi.fn();
    const state = useAsyncAction(action, { errorMessage: "Could not save", onSuccess });

    await expect(state.run()).resolves.toBeUndefined();
    expect(state.error.value).toBe("failed");
    expect(state.errorMessage.value).toBe("Could not save");

    await expect(state.run()).resolves.toBe("recovered");
    expect(state.error.value).toBeNull();
    expect(onSuccess).toHaveBeenCalledWith("recovered");
  });

  it("keeps API feedback but hides technical network errors", async () => {
    const action = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new ApiError("Current password is incorrect", 400));
    const state = useAsyncAction(action, { errorMessage: "Could not change password" });

    await state.run();
    expect(state.errorMessage.value).toBe("Could not change password");

    await state.run();
    expect(state.errorMessage.value).toBe("Current password is incorrect");
  });
});
