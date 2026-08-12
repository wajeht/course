import { afterEach, describe, expect, it, vi } from "vitest";

import { createToast } from "./useToast.js";

describe("createToast", () => {
  afterEach(() => vi.useRealTimers());

  it("adds, dismisses, and automatically expires notifications", () => {
    vi.useFakeTimers();
    const toast = createToast();
    const persistentId = toast.success("Saved", 0);
    toast.error("Failed", 1_000);

    expect(toast.toasts.value.map((item) => item.message)).toEqual(["Saved", "Failed"]);
    vi.advanceTimersByTime(1_000);
    expect(toast.toasts.value.map((item) => item.message)).toEqual(["Saved"]);

    toast.dismiss(persistentId);
    expect(toast.toasts.value).toHaveLength(0);
  });

  it("keeps separate application instances isolated", () => {
    const first = createToast();
    const second = createToast();

    first.success("Only first", 0);

    expect(first.toasts.value).toHaveLength(1);
    expect(second.toasts.value).toHaveLength(0);
  });
});
