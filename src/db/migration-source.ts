import fs from "node:fs/promises";
import path from "node:path";

import type { Knex } from "knex";

const sourceExtensions = new Set([".js", ".ts"]);

interface MigrationModule {
  up?: Knex.Migration["up"];
  down?: Knex.Migration["down"];
  default?: Knex.Migration;
}

export function createMigrationSource(directory: string): Knex.MigrationSource<string> {
  const files = new Map<string, string>();

  return {
    async getMigrations(): Promise<string[]> {
      const preferredExtension = directory.includes(`${path.sep}dist${path.sep}`) ? ".js" : ".ts";
      const directoryEntries = await fs.readdir(directory, { withFileTypes: true });
      const candidates = directoryEntries
        .filter((entry) => entry.isFile() && sourceExtensions.has(path.extname(entry.name)))
        .map((entry) => entry.name)
        .sort();

      files.clear();
      for (const file of candidates) {
        const migrationName = `${path.parse(file).name}.js`;
        const current = files.get(migrationName);
        if (!current || path.extname(file) === preferredExtension) files.set(migrationName, file);
      }

      return [...files.keys()].sort();
    },

    getMigrationName(migration: string): string {
      return migration;
    },

    async getMigration(migration: string): Promise<Knex.Migration> {
      const file = files.get(migration) ?? migration;
      // SAFETY: Migration files are the project's own modules and are validated below.
      const module = (await import(path.join(directory, file))) as MigrationModule;
      const loaded = module.default ?? module;
      if (!(loaded.up instanceof Function) || !(loaded.down instanceof Function)) {
        throw new TypeError(`Migration ${migration} must export up and down functions`);
      }
      // SAFETY: Both required migration functions were validated immediately above.
      return loaded as Knex.Migration;
    },
  };
}
