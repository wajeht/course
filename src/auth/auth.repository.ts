import type { Knex } from "knex";

const passwordKey = "app_password";

export interface AuthRepository {
  getPasswordHash(): Promise<string | null>;
  setPasswordHash(passwordHash: string): Promise<void>;
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
  };
}
