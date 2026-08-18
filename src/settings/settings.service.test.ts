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
  it("loads the default catalog page size", async () => {
    const service = createSettingsService(createSettingsRepository(database.connection));

    await expect(service.getSettings()).resolves.toEqual({ catalogPageSize: 24 });
  });

  it("updates the catalog page size", async () => {
    const service = createSettingsService(createSettingsRepository(database.connection));

    await expect(service.updateSettings({ catalogPageSize: 48 })).resolves.toEqual({
      catalogPageSize: 48,
    });
    await expect(service.getCatalogPageSize()).resolves.toBe(48);
  });
});
