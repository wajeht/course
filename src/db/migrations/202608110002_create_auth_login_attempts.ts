import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("auth_login_attempts", (table) => {
    table.text("client_key").primary();
    table.integer("failures").notNullable();
    table.bigInteger("reset_at").notNullable();
    table.index("reset_at", "auth_login_attempts_reset_at_idx");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("auth_login_attempts");
}
