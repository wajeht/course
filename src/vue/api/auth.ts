import { apiClient, expectJson, expectProtectedJson } from "./client.js";

export interface AuthStateDto {
  authenticated: boolean;
  passwordConfigured: boolean;
  setupEnabled: boolean;
  setupTokenRequired: boolean;
}

export const authApi = {
  async getAuthState(signal?: AbortSignal): Promise<AuthStateDto> {
    return expectJson(await apiClient.api.auth.me.$get({}, { init: { signal } }));
  },
  async login(password: string): Promise<void> {
    await expectJson(await apiClient.api.auth.$post({ json: { password } }));
  },
  async logout(): Promise<void> {
    await expectJson(await apiClient.api.auth.logout.$post());
  },
  async setupPassword(
    password: string,
    confirmPassword: string,
    setupToken?: string,
  ): Promise<void> {
    await expectJson(
      await apiClient.api.auth.password.$post({
        json: { password, confirmPassword, setupToken },
      }),
    );
  },
  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> {
    await expectProtectedJson(
      await apiClient.api.auth.password.$put({
        json: { currentPassword, newPassword, confirmPassword },
      }),
    );
  },
};
