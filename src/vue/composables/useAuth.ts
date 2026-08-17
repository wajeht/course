import { inject, reactive, readonly, type InjectionKey } from "vue";

import { api, type AuthStateDto } from "@/api.js";
import { clearCatalogSnapshot } from "@/catalog-cache.js";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthClient {
  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void>;
  getAuthState(signal?: AbortSignal): Promise<AuthStateDto>;
  login(password: string): Promise<void>;
  logout(): Promise<void>;
  setupPassword(password: string, confirmPassword: string, setupToken?: string): Promise<void>;
}

export interface AuthController {
  changePassword: AuthClient["changePassword"];
  dispose(): void;
  initialize(): Promise<void>;
  login(password: string): Promise<void>;
  logout(): Promise<void>;
  setupPassword(password: string, confirmPassword: string, setupToken?: string): Promise<void>;
  state: Readonly<{
    error: string;
    passwordConfigured: boolean;
    setupEnabled: boolean;
    setupTokenRequired: boolean;
    status: AuthStatus;
  }>;
}

export const authKey: InjectionKey<AuthController> = Symbol("course-auth");

export function createAuth(
  client: AuthClient = api,
  checkTimeoutMilliseconds = 10_000,
): AuthController {
  const state = reactive({
    status: "loading" as AuthStatus,
    passwordConfigured: false,
    setupEnabled: false,
    setupTokenRequired: false,
    error: "",
  });

  function handleUnauthorized(): void {
    clearCatalogSnapshot();
    state.status = "unauthenticated";
    state.passwordConfigured = true;
    state.error = "Your session expired. Sign in again.";
  }

  if (typeof window !== "undefined") {
    window.addEventListener("course:unauthorized", handleUnauthorized);
  }

  async function initialize(): Promise<void> {
    state.status = "loading";
    state.error = "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), checkTimeoutMilliseconds);
    try {
      const result = await client.getAuthState(controller.signal);
      state.passwordConfigured = result.passwordConfigured;
      state.setupEnabled = result.setupEnabled;
      state.setupTokenRequired = result.setupTokenRequired;
      state.status = result.authenticated ? "authenticated" : "unauthenticated";
      if (!result.authenticated) clearCatalogSnapshot();
    } catch (caught) {
      state.status = "error";
      state.error = controller.signal.aborted
        ? "Session check timed out. Try again."
        : caught instanceof Error
          ? caught.message
          : "Could not verify your session";
    } finally {
      clearTimeout(timeout);
    }
  }

  async function login(password: string): Promise<void> {
    await client.login(password);
    await initialize();
  }

  async function setupPassword(
    password: string,
    confirmPassword: string,
    setupToken?: string,
  ): Promise<void> {
    await client.setupPassword(password, confirmPassword, setupToken);
    state.passwordConfigured = true;
    await login(password);
  }

  async function logout(): Promise<void> {
    await client.logout();
    clearCatalogSnapshot();
    state.status = "unauthenticated";
    state.error = "";
  }

  return {
    changePassword: client.changePassword,
    dispose: () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("course:unauthorized", handleUnauthorized);
      }
    },
    initialize,
    login,
    logout,
    setupPassword,
    state: readonly(state),
  };
}

export function useAuth(): AuthController {
  const auth = inject(authKey);
  if (!auth) throw new Error("Auth provider is not installed");
  return auth;
}
