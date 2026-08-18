import fs from "node:fs/promises";
import path from "node:path";

import knex, { type Knex } from "knex";

import type { Configuration } from "../config.js";
import type { Logger } from "../logger.js";
import { createKnexConfig } from "./knexfile.js";

export interface Database {
  connection: Knex;
  close(): Promise<void>;
}

export async function createDatabase(
  configuration: Configuration,
  logger: Logger,
): Promise<Database> {
  if (configuration.database.filename !== ":memory:") {
    await fs.mkdir(path.dirname(configuration.database.filename), { recursive: true });
  }

  const connection = knex(createKnexConfig(configuration));
  const [batch, migrations] = await connection.migrate.latest();
  logger.info("Database ready", { batch, migrations });

  return {
    connection,
    close: () => connection.destroy(),
  };
}
