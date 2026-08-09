import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("courses", (table) => {
    table.text("id").primary();
    table.text("path").notNullable().unique();
    table.text("title").notNullable();
    table.text("description").notNullable().defaultTo("");
    table.text("cover_path");
    table.text("cover_origin");
    table.integer("sort_order").notNullable();
    table.text("created_at").notNullable();
    table.text("updated_at").notNullable();
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

  await knex.schema.createTable("conversion_jobs", (table) => {
    table.text("lesson_id").primary().references("id").inTable("lessons").onDelete("CASCADE");
    table.text("status").notNullable();
    table.float("progress").notNullable().defaultTo(0);
    table.text("playlist_path");
    table.text("error");
    table.text("created_at").notNullable();
    table.text("updated_at").notNullable();
  });

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
  await knex.schema.raw("CREATE INDEX lessons_course_sort_idx ON lessons(course_id, sort_order)");
  await knex.schema.raw("CREATE INDEX sections_course_sort_idx ON sections(course_id, sort_order)");
  await knex.schema.raw("CREATE INDEX progress_updated_idx ON progress(updated_at)");
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("scan_state");
  await knex.schema.dropTableIfExists("conversion_jobs");
  await knex.schema.dropTableIfExists("progress");
  await knex.schema.dropTableIfExists("lessons");
  await knex.schema.dropTableIfExists("sections");
  await knex.schema.dropTableIfExists("courses");
}
