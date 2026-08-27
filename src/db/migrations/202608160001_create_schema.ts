import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("playlists", (table) => {
    table.text("id").primary();
    table.text("path").notNullable().unique();
    table.text("title").notNullable();
    table.text("description").notNullable().defaultTo("");
    table.text("tags_json").notNullable().defaultTo("[]");
    table.text("cover_path");
    table.text("source_provider");
    table.text("source_url");
    table.integer("sort_order").notNullable();
    table.check(
      "(source_provider IS NULL AND source_url IS NULL) OR (source_provider IS NOT NULL AND source_url IS NOT NULL)",
    );
  });

  await knex.schema.createTable("playlist_sections", (table) => {
    table.text("id").primary();
    table
      .text("playlist_id")
      .notNullable()
      .references("id")
      .inTable("playlists")
      .onDelete("CASCADE");
    table.text("path").notNullable().unique();
    table.text("title").notNullable();
    table.integer("sort_order").notNullable();
    table.unique(["id", "playlist_id"]);
  });

  await knex.schema.createTable("videos", (table) => {
    table.text("id").primary();
    table.text("path").notNullable().unique();
    table.text("playlist_id").references("id").inTable("playlists").onDelete("CASCADE");
    table.text("playlist_section_id");
    table.text("title").notNullable();
    table.text("description").notNullable().defaultTo("");
    table.text("tags_json").notNullable().defaultTo("[]");
    table.text("source_provider");
    table.text("source_url");
    table.integer("sort_order").notNullable();
    table.float("duration_seconds").notNullable();
    table.integer("size_bytes").notNullable();
    table.text("container").notNullable();
    table.text("video_codec").notNullable();
    table.text("audio_codec");
    table.boolean("browser_compatible").notNullable().defaultTo(false);
    table.text("modified_at").notNullable();
    table
      .foreign(["playlist_section_id", "playlist_id"])
      .references(["id", "playlist_id"])
      .inTable("playlist_sections")
      .onDelete("CASCADE");
    table.check("playlist_section_id IS NULL OR playlist_id IS NOT NULL");
    table.check(
      "(source_provider IS NULL AND source_url IS NULL) OR (source_provider IS NOT NULL AND source_url IS NOT NULL)",
    );
  });

  await knex.schema.createTable("authors", (table) => {
    table.text("id").primary();
    table.text("name").notNullable();
    table.text("normalized_name").notNullable().unique();
  });

  await knex.schema.createTable("playlist_authors", (table) => {
    table
      .text("playlist_id")
      .notNullable()
      .references("id")
      .inTable("playlists")
      .onDelete("CASCADE");
    table.text("author_id").notNullable().references("id").inTable("authors").onDelete("CASCADE");
    table.integer("sort_order").notNullable();
    table.primary(["playlist_id", "author_id"]);
  });

  await knex.schema.createTable("video_authors", (table) => {
    table.text("video_id").notNullable().references("id").inTable("videos").onDelete("CASCADE");
    table.text("author_id").notNullable().references("id").inTable("authors").onDelete("CASCADE");
    table.integer("sort_order").notNullable();
    table.primary(["video_id", "author_id"]);
  });

  await knex.schema.createTable("chapters", (table) => {
    table.text("id").primary();
    table.text("video_id").notNullable().references("id").inTable("videos").onDelete("CASCADE");
    table.text("title").notNullable();
    table.integer("start_seconds").notNullable();
    table.integer("sort_order").notNullable();
    table.unique(["video_id", "start_seconds"]);
  });

  await knex.schema.createTable("progress", (table) => {
    table.text("video_id").primary().references("id").inTable("videos").onDelete("CASCADE");
    table.float("position_seconds").notNullable().defaultTo(0);
    table.boolean("completed").notNullable().defaultTo(false);
    table.text("updated_at").notNullable();
  });

  await knex.schema.createTable("conversions", (table) => {
    table.text("video_id").primary().references("id").inTable("videos").onDelete("CASCADE");
    table.text("status").notNullable().checkIn(["queued", "converting", "ready", "failed"]);
    table.float("progress").notNullable().defaultTo(0);
    table.text("error");
  });

  await knex.schema.createTable("settings", (table) => {
    table.text("key").primary();
    table.text("value").notNullable();
    table.text("updated_at").notNullable();
  });

  await knex("settings").insert({
    key: "library_page_size",
    value: "24",
    updated_at: new Date().toISOString(),
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

  await knex.schema.raw("CREATE INDEX videos_playlist_sort_idx ON videos(playlist_id, sort_order)");
  await knex.schema.raw(
    "CREATE INDEX playlist_sections_sort_idx ON playlist_sections(playlist_id, sort_order)",
  );
  await knex.schema.raw("CREATE INDEX chapters_video_sort_idx ON chapters(video_id, sort_order)");
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
  await knex.schema.dropTableIfExists("chapters");
  await knex.schema.dropTableIfExists("video_authors");
  await knex.schema.dropTableIfExists("playlist_authors");
  await knex.schema.dropTableIfExists("authors");
  await knex.schema.dropTableIfExists("videos");
  await knex.schema.dropTableIfExists("playlist_sections");
  await knex.schema.dropTableIfExists("playlists");
}
