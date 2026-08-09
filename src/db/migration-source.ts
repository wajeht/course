import fs from "node:fs/promises";
import path from "node:path";

import type { Knex } from "knex";

const sourceExtensions = new Set([".js", ".ts"]);

export class MigrationSource implements Knex.MigrationSource<string> {
  private files = new Map<string, string>();

  constructor(private readonly directory: string) {}

  async getMigrations(): Promise<string[]> {
    const preferredExtension = this.directory.includes(`${path.sep}dist${path.sep}`)
      ? ".js"
      : ".ts";
    const directoryEntries = await fs.readdir(this.directory, { withFileTypes: true });
    const candidates = directoryEntries
      .filter((entry) => entry.isFile() && sourceExtensions.has(path.extname(entry.name)))
      .map((entry) => entry.name)
      .sort();

    this.files.clear();
    for (const file of candidates) {
      const migrationName = `${path.parse(file).name}.js`;
      const current = this.files.get(migrationName);
      if (!current || path.extname(file) === preferredExtension)
        this.files.set(migrationName, file);
    }

    return [...this.files.keys()].sort();
  }

  getMigrationName(migration: string): string {
    return migration;
  }

  async getMigration(migration: string): Promise<Knex.Migration> {
    const file = this.files.get(migration) ?? migration;
    const module = (await import(path.join(this.directory, file))) as {
      up?: Knex.Migration["up"];
      down?: Knex.Migration["down"];
      default?: Knex.Migration;
    };
    const loaded = module.default ?? module;
    if (typeof loaded.up !== "function" || typeof loaded.down !== "function") {
      throw new TypeError(`Migration ${migration} must export up and down functions`);
    }
    return loaded as Knex.Migration;
  }
}
