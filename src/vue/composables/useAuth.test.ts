import { afterEach, describe, expect, it, vi } from "vitest";

import type { AuthStateDto } from "@/api.js";

import { createAuth } from "./useAuth.js";

function createClient() {
  return {
    changePassword: vi.fn(async () => undefined),
    getAuthState: vi.fn<(signal?: AbortSignal) => Promise<AuthStateDto>>(),
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    setupPassword: vi.fn(async () => undefined),
  };
}

describe("createAuth", () => {
  afterEach(() => vi.useRealTimers());

  it("authenticates from the server session", async () => {
    const client = createClient();
    client.getAuthState.mockResolvedValue({
      authenticated: true,
      passwordConfigured: true,
      setupEnabled: false,
      setupTokenRequired: false,
    });

    const auth = createAuth({ client });
    await auth.initialize();

    expect(auth.state.status).toBe("authenticated");
    expect(client.getAuthState).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it("moves stalled session checks to a retryable error", async () => {
    vi.useFakeTimers();
    const client = createClient();
    client.getAuthState.mockImplementation(
      (signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    const auth = createAuth({ client });
    const initialization = auth.initialize();
    await vi.advanceTimersByTimeAsync(10_000);
    await initialization;

    expect(auth.state.status).toBe("error");
    expect(auth.state.error).toBe("Session check timed out. Try again.");
  });

  it("reports every session-cookie change", async () => {
    const client = createClient();
    client.getAuthState.mockResolvedValue({
      authenticated: true,
      passwordConfigured: true,
      setupEnabled: false,
      setupTokenRequired: false,
    });
    const onSessionChange = vi.fn();
    const auth = createAuth({ client, onSessionChange });

    await auth.login("password");
    await auth.changePassword("password", "new-password", "new-password");
    await auth.logout();

    expect(onSessionChange).toHaveBeenCalledTimes(3);
  });
});
