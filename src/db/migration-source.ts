import fs from "node:fs/promises";
import path from "node:path";

import type { Knex } from "knex";
import { z } from "zod";

const sourceExtensions = new Set([".js", ".ts"]);
const migrationSchema = z.object({
  up: z.custom<Knex.Migration["up"]>((value) => value instanceof Function),
  down: z.custom<Knex.Migration["down"]>((value) => value instanceof Function),
});

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
      const module = await import(path.join(directory, file));
      const loaded = module.default ?? module;
      const result = migrationSchema.safeParse(loaded);
      if (!result.success) {
        throw new TypeError(`Migration ${migration} must export up and down functions`);
      }
      return result.data;
    },
  };
}
