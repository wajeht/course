import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("courses", (table) => {
    table.text("category").notNullable().defaultTo("Uncategorized");
    table.text("instructors_json").notNullable().defaultTo("[]");
    table.text("tags_json").notNullable().defaultTo("[]");
  });
  await knex.schema.raw("CREATE INDEX courses_category_idx ON courses(category)");
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw("DROP INDEX IF EXISTS courses_category_idx");
  await knex.schema.alterTable("courses", (table) => {
    table.dropColumns("category", "instructors_json", "tags_json");
  });
}
