import { beforeEach, describe, expect, it } from "vitest";

import type { Database } from "../db/db.js";
import { createTestDatabase } from "../test/resources.js";
import { createSettingsRepository } from "./settings.repository.js";
import { createSettingsService } from "./settings.service.js";

let database: Database;

beforeEach(async () => {
  database = await createTestDatabase();
});

describe("settings service", () => {
  it("loads the default library page size", async () => {
    const service = createSettingsService(createSettingsRepository(database.connection));

    await expect(service.getSettings()).resolves.toEqual({ libraryPageSize: 24 });
  });

  it("updates the library page size", async () => {
    const service = createSettingsService(createSettingsRepository(database.connection));

    await expect(service.updateSettings({ libraryPageSize: 48 })).resolves.toEqual({
      libraryPageSize: 48,
    });
    await expect(service.getLibraryPageSize()).resolves.toBe(48);
  });
});
