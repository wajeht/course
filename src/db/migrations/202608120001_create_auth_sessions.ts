import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("auth_sessions", (table) => {
    table.text("session_key").primary();
    table.bigInteger("created_at").notNullable();
    table.bigInteger("active_at").notNullable();
    table.index("created_at", "auth_sessions_created_at_idx");
    table.index("active_at", "auth_sessions_active_at_idx");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("auth_sessions");
}
