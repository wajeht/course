import { reactive, readonly } from "vue";

import { api } from "../api.js";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

const AUTH_CHECK_TIMEOUT_MS = 10_000;

const state = reactive({
  status: "loading" as AuthStatus,
  passwordConfigured: false,
  setupEnabled: false,
  setupTokenRequired: false,
  error: "",
});

let listening = false;

function listenForExpiredSessions(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("course:unauthorized", () => {
    state.status = "unauthenticated";
    state.passwordConfigured = true;
    state.error = "Your session expired. Sign in again.";
  });
}

export function useAuth() {
  listenForExpiredSessions();

  async function initialize(): Promise<void> {
    state.status = "loading";
    state.error = "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUTH_CHECK_TIMEOUT_MS);
    try {
      const result = await api.getAuthState(controller.signal);
      state.passwordConfigured = result.passwordConfigured;
      state.setupEnabled = result.setupEnabled;
      state.setupTokenRequired = result.setupTokenRequired;
      state.status = result.authenticated ? "authenticated" : "unauthenticated";
    } catch (error) {
      state.status = "error";
      state.error = controller.signal.aborted
        ? "Session check timed out. Try again."
        : error instanceof Error
          ? error.message
          : "Could not verify authentication";
    } finally {
      clearTimeout(timeout);
    }
  }

  async function login(password: string): Promise<void> {
    await api.login(password);
    await initialize();
  }

  async function setupPassword(
    password: string,
    confirmPassword: string,
    setupToken?: string,
  ): Promise<void> {
    await api.setupPassword(password, confirmPassword, setupToken);
    state.passwordConfigured = true;
    await login(password);
  }

  async function logout(): Promise<void> {
    await api.logout();
    state.status = "unauthenticated";
    state.error = "";
  }

  return {
    state: readonly(state),
    initialize,
    login,
    setupPassword,
    logout,
    changePassword: api.changePassword,
  };
}
