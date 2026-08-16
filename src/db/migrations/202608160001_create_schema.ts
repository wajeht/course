import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("courses", (table) => {
    table.text("id").primary();
    table.text("path").notNullable().unique();
    table.text("title").notNullable();
    table.text("description").notNullable().defaultTo("");
    table.text("category").notNullable().defaultTo("Uncategorized");
    table.text("instructors_json").notNullable().defaultTo("[]");
    table.text("tags_json").notNullable().defaultTo("[]");
    table.text("cover_path");
    table.text("cover_origin");
    table.integer("sort_order").notNullable();
  });

  await knex.schema.createTable("sections", (table) => {
    table.text("id").primary();
    table.text("course_id").notNullable().references("id").inTable("courses").onDelete("CASCADE");
    table.text("path").notNullable().unique();
    table.text("title").notNullable();
    table.integer("sort_order").notNullable();
  });

  await knex.schema.createTable("lessons", (table) => {
    table.text("id").primary();
    table.text("course_id").notNullable().references("id").inTable("courses").onDelete("CASCADE");
    table.text("section_id").references("id").inTable("sections").onDelete("CASCADE");
    table.text("path").notNullable().unique();
    table.text("title").notNullable();
    table.integer("sort_order").notNullable();
    table.float("duration_seconds").notNullable();
    table.integer("size_bytes").notNullable();
    table.text("container").notNullable();
    table.text("video_codec").notNullable();
    table.text("audio_codec");
    table.boolean("browser_compatible").notNullable().defaultTo(false);
    table.text("modified_at").notNullable();
  });

  await knex.schema.createTable("progress", (table) => {
    table.text("lesson_id").primary().references("id").inTable("lessons").onDelete("CASCADE");
    table.float("position_seconds").notNullable().defaultTo(0);
    table.boolean("completed").notNullable().defaultTo(false);
    table.text("updated_at").notNullable();
  });

  await knex.schema.createTable("conversions", (table) => {
    table.text("lesson_id").primary().references("id").inTable("lessons").onDelete("CASCADE");
    table.text("status").notNullable().checkIn(["queued", "converting", "ready", "failed"]);
    table.float("progress").notNullable().defaultTo(0);
    table.text("error");
  });

  await knex.schema.createTable("settings", (table) => {
    table.text("key").primary();
    table.text("value").notNullable();
    table.text("updated_at").notNullable();
  });

  await knex.schema.createTable("auth_credentials", (table) => {
    table.integer("id").primary();
    table.text("password_hash").notNullable();
    table.check("id = 1");
  });

  await knex.schema.createTable("auth_sessions", (table) => {
    table.text("session_key").primary();
    table.bigInteger("created_at").notNullable();
    table.bigInteger("active_at").notNullable();
  });

  await knex.schema.createTable("auth_login_attempts", (table) => {
    table.text("client_key").primary();
    table.integer("failures").notNullable();
    table.bigInteger("reset_at").notNullable();
  });

  await knex.schema.raw("CREATE INDEX courses_category_idx ON courses(category)");
  await knex.schema.raw("CREATE INDEX sections_course_sort_idx ON sections(course_id, sort_order)");
  await knex.schema.raw("CREATE INDEX lessons_course_sort_idx ON lessons(course_id, sort_order)");
  await knex.schema.raw("CREATE INDEX progress_updated_idx ON progress(updated_at)");
  await knex.schema.raw("CREATE INDEX conversions_status_idx ON conversions(status)");
  await knex.schema.raw("CREATE INDEX auth_sessions_created_at_idx ON auth_sessions(created_at)");
  await knex.schema.raw("CREATE INDEX auth_sessions_active_at_idx ON auth_sessions(active_at)");
  await knex.schema.raw(
    "CREATE INDEX auth_login_attempts_reset_at_idx ON auth_login_attempts(reset_at)",
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("auth_login_attempts");
  await knex.schema.dropTableIfExists("auth_sessions");
  await knex.schema.dropTableIfExists("auth_credentials");
  await knex.schema.dropTableIfExists("settings");
  await knex.schema.dropTableIfExists("conversions");
  await knex.schema.dropTableIfExists("progress");
  await knex.schema.dropTableIfExists("lessons");
  await knex.schema.dropTableIfExists("sections");
  await knex.schema.dropTableIfExists("courses");
}
