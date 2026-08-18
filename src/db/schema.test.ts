import { describe, expect, it } from "vitest";

import { createTestDatabase } from "../test/resources.js";

describe("database schema", () => {
  it("creates only the application tables", async () => {
    const database = await createTestDatabase();

    const tables = (
      await database.connection("sqlite_master").where({ type: "table" }).pluck("name")
    )
      .filter((name: string) => !name.startsWith("knex_") && name !== "sqlite_sequence")
      .sort();
    expect(tables).toEqual([
      "auth_credentials",
      "auth_login_attempts",
      "auth_sessions",
      "chapters",
      "conversions",
      "courses",
      "lessons",
      "progress",
      "sections",
      "settings",
    ]);
    await expect(database.connection("knex_migrations").pluck("name")).resolves.toEqual([
      "202608160001_create_schema.js",
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
