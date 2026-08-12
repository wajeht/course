import { describe, expect, it } from "vitest";

import { createConfirmation } from "./useConfirm.js";

describe("createConfirmation", () => {
  it("resolves accepted and cancelled confirmations", async () => {
    const confirmation = createConfirmation();
    const owner = Symbol("owner");
    const accepted = confirmation.request(owner, {
      title: "Delete?",
      message: "This is permanent.",
    });
    expect(confirmation.active.value?.title).toBe("Delete?");
    confirmation.accept();
    await expect(accepted).resolves.toBe(true);

    const cancelled = confirmation.request(owner, {
      title: "Leave?",
      message: "Changes are unsaved.",
    });
    confirmation.cancel();
    await expect(cancelled).resolves.toBe(false);
  });

  it("queues requests without replacing the active dialog", async () => {
    const confirmation = createConfirmation();
    const owner = Symbol("owner");
    const first = confirmation.request(owner, { title: "First", message: "First request" });
    const second = confirmation.request(owner, { title: "Second", message: "Second request" });

    expect(confirmation.active.value?.title).toBe("First");
    confirmation.accept();
    await expect(first).resolves.toBe(true);
    expect(confirmation.active.value?.title).toBe("Second");
    confirmation.cancel();
    await expect(second).resolves.toBe(false);
  });

  it("cancels only requests owned by the disposed caller", async () => {
    const confirmation = createConfirmation();
    const firstOwner = Symbol("first");
    const secondOwner = Symbol("second");
    const first = confirmation.request(firstOwner, { title: "First", message: "First request" });
    const second = confirmation.request(secondOwner, {
      title: "Second",
      message: "Second request",
    });

    confirmation.cancelOwner(firstOwner);

    await expect(first).resolves.toBe(false);
    expect(confirmation.active.value?.title).toBe("Second");
    confirmation.accept();
    await expect(second).resolves.toBe(true);
  });
});
