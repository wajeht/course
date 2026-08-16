import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createConfiguration } from "../../../configuration.js";
import { createDatabase, type Database } from "../../../db/db.js";
import { createLogger } from "../../../logger.js";
import { createSettingsRepository } from "./settings.repository.js";
import { createSettingsService } from "./settings.service.js";

let database: Database;

beforeEach(async () => {
  database = await createDatabase(createConfiguration({ APP_ENV: "testing" }), createLogger());
});

afterEach(async () => database.close());

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
