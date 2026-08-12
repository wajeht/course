import { afterEach, describe, expect, it, vi } from "vitest";

import { useConfirm } from "./useConfirm.js";
import { useModalStack } from "./useModalStack.js";
import { useToast } from "./useToast.js";

describe("useConfirm", () => {
  const confirmation = useConfirm();

  afterEach(() => confirmation.clear());

  it("resolves accepted and cancelled confirmations", async () => {
    const accepted = confirmation.confirm({ title: "Delete?", message: "This is permanent." });
    expect(confirmation.active.value?.title).toBe("Delete?");
    confirmation.accept();
    await expect(accepted).resolves.toBe(true);

    const cancelled = confirmation.confirm({ title: "Leave?", message: "Changes are unsaved." });
    confirmation.cancel();
    await expect(cancelled).resolves.toBe(false);
  });

  it("queues requests without replacing the active dialog", async () => {
    const first = confirmation.confirm({ title: "First", message: "First request" });
    const second = confirmation.confirm({ title: "Second", message: "Second request" });

    expect(confirmation.active.value?.title).toBe("First");
    confirmation.accept();
    await expect(first).resolves.toBe(true);
    expect(confirmation.active.value?.title).toBe("Second");
    confirmation.cancel();
    await expect(second).resolves.toBe(false);
  });
});

describe("useToast", () => {
  const toast = useToast();

  afterEach(() => {
    toast.clear();
    vi.useRealTimers();
  });

  it("adds, dismisses, and automatically expires notifications", () => {
    vi.useFakeTimers();
    const persistentId = toast.success("Saved", 0);
    toast.error("Failed", 1_000);

    expect(toast.toasts.value.map((item) => item.message)).toEqual(["Saved", "Failed"]);
    vi.advanceTimersByTime(1_000);
    expect(toast.toasts.value.map((item) => item.message)).toEqual(["Saved"]);

    toast.dismiss(persistentId);
    expect(toast.toasts.value).toHaveLength(0);
  });
});

describe("useModalStack", () => {
  it("only treats the latest registered modal as topmost", () => {
    const modalStack = useModalStack();
    const firstClose = vi.fn();
    const secondClose = vi.fn();
    const first = modalStack.register(firstClose);
    const second = modalStack.register(secondClose);

    expect(modalStack.isTop(first)).toBe(false);
    expect(modalStack.isTop(second)).toBe(true);
    modalStack.closeTop();
    expect(secondClose).toHaveBeenCalledOnce();

    modalStack.unregister(second);
    expect(modalStack.isTop(first)).toBe(true);
    modalStack.unregister(first);
  });
});
