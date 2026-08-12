import type { Knex } from "knex";

const passwordKey = "app_password";

export interface LoginAttempt {
  failures: number;
  resetAt: number;
}

export interface AuthRepository {
  getPasswordHash(): Promise<string | null>;
  setPasswordHash(passwordHash: string): Promise<void>;
  getLoginAttempt(clientKey: string, now: number): Promise<LoginAttempt | null>;
  recordLoginFailure(clientKey: string, now: number, windowMs: number): Promise<void>;
  clearLoginFailures(clientKey: string): Promise<void>;
}

export function createAuthRepository(database: Knex): AuthRepository {
  return {
    async getPasswordHash(): Promise<string | null> {
      const setting = await database("settings")
        .where({ key: passwordKey })
        .first<{ value: string }>();
      return setting?.value ?? null;
    },

    async setPasswordHash(passwordHash: string): Promise<void> {
      const updatedAt = new Date().toISOString();
      await database("settings")
        .insert({ key: passwordKey, value: passwordHash, updated_at: updatedAt })
        .onConflict("key")
        .merge({ value: passwordHash, updated_at: updatedAt });
    },

    async getLoginAttempt(clientKey: string, now: number): Promise<LoginAttempt | null> {
      const attempt = await database("auth_login_attempts")
        .where({ client_key: clientKey })
        .first<{ failures: number; reset_at: number }>();
      if (!attempt) return null;

      const resetAt = Number(attempt.reset_at);
      if (resetAt <= now) {
        await database("auth_login_attempts")
          .where({ client_key: clientKey })
          .andWhere("reset_at", "<=", now)
          .delete();
        return null;
      }

      return { failures: attempt.failures, resetAt };
    },

    async recordLoginFailure(clientKey: string, now: number, windowMs: number): Promise<void> {
      await database.transaction(async (transaction) => {
        await transaction("auth_login_attempts").where("reset_at", "<=", now).delete();
        const current = await transaction("auth_login_attempts")
          .where({ client_key: clientKey })
          .first<{ failures: number; reset_at: number }>();
        const resetAt = current ? Number(current.reset_at) : now + windowMs;

        await transaction("auth_login_attempts")
          .insert({
            client_key: clientKey,
            failures: (current?.failures ?? 0) + 1,
            reset_at: resetAt,
          })
          .onConflict("client_key")
          .merge();
      });
    },

    async clearLoginFailures(clientKey: string): Promise<void> {
      await database("auth_login_attempts").where({ client_key: clientKey }).delete();
    },
  };
}
