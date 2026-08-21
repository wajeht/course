import { describe, expect, it, vi } from "vitest";

import { useIntentPrefetch } from "./useIntentPrefetch.js";

describe("useIntentPrefetch", () => {
  it("runs prefetch immediately", () => {
    const action = vi.fn();
    const intent = useIntentPrefetch(action);
    intent.run();
    expect(action).toHaveBeenCalledOnce();
  });
});
