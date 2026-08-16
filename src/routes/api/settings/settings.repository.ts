import type { Knex } from "knex";

interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

export interface SettingsRepository {
  getValue(key: string): Promise<string>;
  setValue(key: string, value: string): Promise<void>;
}

export function createSettingsRepository(database: Knex): SettingsRepository {
  return {
    async getValue(key) {
      const row = await database<SettingRow>("settings").select("value").where({ key }).first();
      if (!row) throw new Error(`Missing setting: ${key}`);
      return row.value;
    },

    async setValue(key, value) {
      const updated = await database("settings")
        .where({ key })
        .update({ value, updated_at: new Date().toISOString() });
      if (updated !== 1) throw new Error(`Missing setting: ${key}`);
    },
  };
}
