import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getAuthState = vi.hoisted(() => vi.fn());

vi.mock("../api.js", () => ({
  api: {
    changePassword: vi.fn(),
    getAuthState,
    login: vi.fn(),
    logout: vi.fn(),
    setupPassword: vi.fn(),
  },
}));

import { useAuth } from "./useAuth.js";

describe("useAuth", () => {
  beforeEach(() => {
    getAuthState.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("authenticates from the server session", async () => {
    getAuthState.mockResolvedValue({
      authenticated: true,
      passwordConfigured: true,
      setupEnabled: false,
      setupTokenRequired: false,
    });

    const auth = useAuth();
    await auth.initialize();

    expect(auth.state.status).toBe("authenticated");
    expect(getAuthState).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it("moves stalled session checks to a retryable error", async () => {
    vi.useFakeTimers();
    getAuthState.mockImplementation(
      (signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );

    const auth = useAuth();
    const initialization = auth.initialize();
    await vi.advanceTimersByTimeAsync(10_000);
    await initialization;

    expect(auth.state.status).toBe("error");
    expect(auth.state.error).toBe("Session check timed out. Try again.");
  });
});
