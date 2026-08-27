import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("videos", (table) => table.dropColumn("cover_path"));
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("videos", (table) => table.text("cover_path"));
}
