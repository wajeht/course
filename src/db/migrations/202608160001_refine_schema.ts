import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("auth_credentials", (table) => {
    table.integer("id").primary();
    table.text("password_hash").notNullable();
    table.check("id = 1");
  });
  await knex.raw(
    "INSERT INTO auth_credentials (id, password_hash) SELECT 1, value FROM settings WHERE key = 'app_password'",
  );

  await knex.schema.renameTable("auth_login_attempts", "login_attempts");
  await knex.schema.raw("DROP INDEX auth_login_attempts_reset_at_idx");
  await knex.schema.raw("CREATE INDEX login_attempts_reset_at_idx ON login_attempts(reset_at)");

  await knex.schema.createTable("conversions", (table) => {
    table.text("lesson_id").primary().references("id").inTable("lessons").onDelete("CASCADE");
    table.text("status").notNullable().checkIn(["queued", "converting", "ready", "failed"]);
    table.float("progress").notNullable().defaultTo(0);
    table.text("error");
    table.index("status", "conversions_status_idx");
  });
  await knex.raw(
    "INSERT INTO conversions (lesson_id, status, progress, error) SELECT lesson_id, status, progress, error FROM conversion_jobs",
  );

  await knex.schema.dropTable("conversion_jobs");
  await knex.schema.dropTable("scan_state");
  await knex.schema.dropTable("settings");
  await knex.schema.raw("ALTER TABLE courses DROP COLUMN created_at");
  await knex.schema.raw("ALTER TABLE courses DROP COLUMN updated_at");
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw("ALTER TABLE courses ADD COLUMN created_at TEXT NOT NULL DEFAULT ''");
  await knex.schema.raw("ALTER TABLE courses ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''");

  await knex.schema.createTable("settings", (table) => {
    table.text("key").primary();
    table.text("value").notNullable();
    table.text("updated_at").notNullable();
  });
  await knex.raw(
    "INSERT INTO settings (key, value, updated_at) SELECT 'app_password', password_hash, '' FROM auth_credentials",
  );

  await knex.schema.createTable("scan_state", (table) => {
    table.integer("id").primary();
    table.text("status").notNullable();
    table.text("started_at");
    table.text("completed_at");
    table.integer("course_count").notNullable().defaultTo(0);
    table.integer("lesson_count").notNullable().defaultTo(0);
    table.text("warnings_json").notNullable().defaultTo("[]");
    table.text("error");
  });
  await knex("scan_state").insert({ id: 1, status: "idle" });

  await knex.schema.createTable("conversion_jobs", (table) => {
    table.text("lesson_id").primary().references("id").inTable("lessons").onDelete("CASCADE");
    table.text("status").notNullable();
    table.float("progress").notNullable().defaultTo(0);
    table.text("playlist_path");
    table.text("error");
    table.text("created_at").notNullable().defaultTo("");
    table.text("updated_at").notNullable().defaultTo("");
  });
  await knex.raw(
    "INSERT INTO conversion_jobs (lesson_id, status, progress, error) SELECT lesson_id, status, progress, error FROM conversions",
  );

  await knex.schema.dropTable("conversions");
  await knex.schema.raw("DROP INDEX login_attempts_reset_at_idx");
  await knex.schema.renameTable("login_attempts", "auth_login_attempts");
  await knex.schema.raw(
    "CREATE INDEX auth_login_attempts_reset_at_idx ON auth_login_attempts(reset_at)",
  );
  await knex.schema.dropTable("auth_credentials");
}
