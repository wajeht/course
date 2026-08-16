import { afterEach, describe, expect, it } from "vitest";

import { createConfiguration } from "../configuration.js";
import { createDatabase, type Database } from "./db.js";
import { createLogger } from "../logger.js";

let database: Database | null = null;

afterEach(async () => {
  await database?.close();
  database = null;
});

describe("database schema", () => {
  it("creates only the application tables", async () => {
    database = await createDatabase(createConfiguration({ APP_ENV: "testing" }), createLogger());

    const tables = (
      await database.connection("sqlite_master").where({ type: "table" }).pluck("name")
    )
      .filter((name: string) => !name.startsWith("knex_") && name !== "sqlite_sequence")
      .sort();
    expect(tables).toEqual([
      "auth_credentials",
      "auth_login_attempts",
      "auth_sessions",
      "conversions",
      "courses",
      "lessons",
      "progress",
      "sections",
      "settings",
    ]);

    await expect(database.connection("courses").columnInfo()).resolves.not.toHaveProperty(
      "created_at",
    );
    await expect(database.connection("courses").columnInfo()).resolves.not.toHaveProperty(
      "updated_at",
    );
    await expect(database.connection("courses").columnInfo()).resolves.not.toHaveProperty(
      "cover_origin",
    );
    await expect(database.connection("conversions").columnInfo()).resolves.toEqual(
      expect.objectContaining({
        lesson_id: expect.any(Object),
        status: expect.any(Object),
        progress: expect.any(Object),
        error: expect.any(Object),
      }),
    );
  });
});
