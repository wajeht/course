import { describe, expect, it, vi } from "vitest";

import { useModalStack } from "./useModalStack.js";

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
