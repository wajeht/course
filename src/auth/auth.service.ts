import crypto from "node:crypto";

import bcrypt from "bcryptjs";

import type { Configuration } from "../configuration.js";
import type { AuthRepository, LoginAttempt } from "./auth.repository.js";

export interface SessionPayload {
  createdAt: number;
  activeAt: number;
  nonce: string;
}

export type PasswordResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "not_configured" | "already_configured" | "setup_disabled" };

export interface AuthService {
  isPasswordConfigured(): Promise<boolean>;
  verifyPassword(password: string): Promise<boolean>;
  setupPassword(password: string, setupToken?: string): Promise<PasswordResult>;
  changePassword(currentPassword: string, newPassword: string): Promise<PasswordResult>;
  getLoginAttempt(clientKey: string, now?: number): Promise<LoginAttempt | null>;
  recordLoginFailure(clientKey: string, now?: number): Promise<void>;
  clearLoginFailures(clientKey: string): Promise<void>;
  createSession(now?: number): string;
  refreshSession(payload: SessionPayload, now?: number): string;
  parseSession(value: string, now?: number): SessionPayload | null;
}

function hasValidPasswordLength(password: string): boolean {
  return password.length >= 8 && Buffer.byteLength(password, "utf8") <= 72;
}

function safeEqual(left: string, right: string): boolean {
  const leftHash = crypto.createHash("sha256").update(left).digest();
  const rightHash = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

function serializeSession(payload: SessionPayload): string {
  return `${payload.createdAt}.${payload.activeAt}.${payload.nonce}`;
}

export function createAuthService(
  repository: AuthRepository,
  configuration: Configuration,
): AuthService {
  return {
    async isPasswordConfigured(): Promise<boolean> {
      return Boolean(await repository.getPasswordHash());
    },

    async verifyPassword(password: string): Promise<boolean> {
      const hash = await repository.getPasswordHash();
      return (
        Boolean(hash) &&
        Buffer.byteLength(password, "utf8") <= 72 &&
        bcrypt.compare(password, hash!)
      );
    },

    async setupPassword(password: string, setupToken?: string): Promise<PasswordResult> {
      if (await repository.getPasswordHash()) return { ok: false, reason: "already_configured" };
      if (!hasValidPasswordLength(password)) return { ok: false, reason: "invalid" };
      if (configuration.app.env === "production") {
        if (!configuration.auth.setupToken) return { ok: false, reason: "setup_disabled" };
        if (!setupToken || !safeEqual(setupToken, configuration.auth.setupToken)) {
          return { ok: false, reason: "invalid" };
        }
      }
      await repository.setPasswordHash(
        await bcrypt.hash(password, configuration.app.env === "testing" ? 4 : 12),
      );
      return { ok: true };
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<PasswordResult> {
      if (!(await repository.getPasswordHash())) return { ok: false, reason: "not_configured" };
      if (!(await this.verifyPassword(currentPassword)) || !hasValidPasswordLength(newPassword)) {
        return { ok: false, reason: "invalid" };
      }
      await repository.setPasswordHash(
        await bcrypt.hash(newPassword, configuration.app.env === "testing" ? 4 : 12),
      );
      return { ok: true };
    },

    getLoginAttempt(clientKey: string, now = Date.now()): Promise<LoginAttempt | null> {
      return repository.getLoginAttempt(clientKey, now);
    },

    recordLoginFailure(clientKey: string, now = Date.now()): Promise<void> {
      return repository.recordLoginFailure(clientKey, now, configuration.auth.loginWindowMs);
    },

    clearLoginFailures(clientKey: string): Promise<void> {
      return repository.clearLoginFailures(clientKey);
    },

    createSession(now = Date.now()): string {
      return serializeSession({
        createdAt: now,
        activeAt: now,
        nonce: crypto.randomBytes(16).toString("hex"),
      });
    },

    refreshSession(payload: SessionPayload, now = Date.now()): string {
      return serializeSession({ ...payload, activeAt: now });
    },

    parseSession(value: string, now = Date.now()): SessionPayload | null {
      const parts = value.split(".");
      if (parts.length !== 3) return null;
      const [createdAtValue, activeAtValue, nonce] = parts as [string, string, string];
      if (!/^\d+$/.test(createdAtValue) || !/^\d+$/.test(activeAtValue)) return null;
      if (!/^[a-f0-9]{32}$/i.test(nonce)) return null;
      const createdAt = Number(createdAtValue);
      const activeAt = Number(activeAtValue);
      if (!Number.isSafeInteger(createdAt) || !Number.isSafeInteger(activeAt)) return null;
      if (createdAt > now || activeAt < createdAt || activeAt > now) return null;
      if (now - createdAt > configuration.auth.absoluteTimeoutMs) return null;
      if (now - activeAt > configuration.auth.idleTimeoutMs) return null;
      return { createdAt, activeAt, nonce };
    },
  };
}
