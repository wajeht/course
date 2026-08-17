import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("chapters", (table) => {
    table.text("id").primary();
    table.text("lesson_id").notNullable().references("id").inTable("lessons").onDelete("CASCADE");
    table.text("title").notNullable();
    table.integer("start_seconds").notNullable();
    table.integer("sort_order").notNullable();
    table.unique(["lesson_id", "start_seconds"]);
  });

  await knex.schema.raw("CREATE INDEX chapters_lesson_sort_idx ON chapters(lesson_id, sort_order)");
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("chapters");
}
