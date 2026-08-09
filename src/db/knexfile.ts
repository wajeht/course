import path from "node:path";
import { fileURLToPath } from "node:url";

import type BetterSqlite3 from "better-sqlite3";
import type { Knex } from "knex";

import type { Configuration } from "../configuration.js";
import { MigrationSource } from "./migration-source.js";

export function createKnexConfig(configuration: Configuration): Knex.Config {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDirectory = path.join(currentDirectory, "migrations");

  return {
    client: "better-sqlite3",
    connection: {
      filename: configuration.database.filename,
    },
    useNullAsDefault: true,
    pool: {
      min: 0,
      max: 1,
      acquireTimeoutMillis: 15_000,
      afterCreate(
        connection: BetterSqlite3.Database,
        done: (error: Error | null, value: unknown) => void,
      ) {
        try {
          connection.pragma("foreign_keys = ON");
          if (configuration.database.filename !== ":memory:")
            connection.pragma("journal_mode = WAL");
          connection.pragma("synchronous = NORMAL");
          connection.pragma("busy_timeout = 30000");
          connection.pragma("cache_size = -32000");
          connection.pragma("temp_store = MEMORY");
          done(null, connection);
        } catch (error) {
          done(error as Error, connection);
        }
      },
    },
    migrations: {
      migrationSource: new MigrationSource(migrationsDirectory),
      tableName: "knex_migrations",
    },
  };
}
