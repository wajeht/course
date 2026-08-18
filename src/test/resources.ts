import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createConfiguration, type Configuration } from "../config.js";
import { createContext, type AppContext } from "../context.js";
import { createDatabase, type Database } from "../db/db.js";
import { createLogger } from "../logger.js";

const databases = new Set<Database>();
const temporaryDirectories = new Set<string>();

export async function createTemporaryDirectory(prefix: string): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  temporaryDirectories.add(directory);
  return directory;
}

export async function createTestDatabase(
  configuration = createConfiguration({ APP_ENV: "testing" }),
): Promise<Database> {
  const database = await createDatabase(configuration, createLogger());
  databases.add(database);
  return database;
}

export async function createTestContext(configuration: Configuration): Promise<AppContext> {
  const context = await createContext(configuration);
  databases.add(context.database);
  return context;
}

export async function closeTestDatabase(database: Database): Promise<void> {
  databases.delete(database);
  await database.close();
}

export async function cleanupTestResources(): Promise<void> {
  const openDatabases = [...databases];
  databases.clear();
  await Promise.all(openDatabases.map((database) => database.close()));

  const directories = [...temporaryDirectories];
  temporaryDirectories.clear();
  await Promise.all(directories.map((directory) => fs.rm(directory, { recursive: true })));
}
