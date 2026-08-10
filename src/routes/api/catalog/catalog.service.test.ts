import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createConfiguration } from "../../../configuration.js";
import { createDatabase, type Database } from "../../../db/db.js";
import { createLogger } from "../../../utils/logger.js";
import { createCatalogApiRepository } from "./catalog.repository.js";
import { createCatalogService } from "./catalog.service.js";

let database: Database;

beforeEach(async () => {
  database = await createDatabase(createConfiguration({ APP_ENV: "testing" }), createLogger());
  const now = new Date().toISOString();
  await database.connection("courses").insert([
    {
      id: "a".repeat(24),
      path: "technology",
      title: "Container Fundamentals",
      description: "Build reliable services",
      category: "Technology",
      instructors_json: JSON.stringify(["Jane Smith"]),
      tags_json: JSON.stringify(["Docker", "DevOps"]),
      sort_order: 0,
      created_at: now,
      updated_at: now,
    },
    {
      id: "b".repeat(24),
      path: "martial-arts",
      title: "Guard Retention",
      description: "Stay connected",
      category: "Martial Arts",
      instructors_json: JSON.stringify(["John Doe", "jane smith"]),
      tags_json: JSON.stringify(["Guard"]),
      sort_order: 1,
      created_at: now,
      updated_at: now,
    },
  ]);
});

afterEach(async () => database.close());

describe("catalog service", () => {
  it("filters courses by category and lists category counts", async () => {
    const service = createCatalogService(createCatalogApiRepository(database.connection));

    await expect(service.getCatalog(undefined, "Technology")).resolves.toMatchObject({
      courses: [
        {
          title: "Container Fundamentals",
          category: "Technology",
          instructors: ["Jane Smith"],
          tags: ["Docker", "DevOps"],
        },
      ],
      categories: [
        { name: "Martial Arts", courseCount: 1 },
        { name: "Technology", courseCount: 1 },
      ],
    });
  });

  it("searches category, instructors, and tags", async () => {
    const service = createCatalogService(createCatalogApiRepository(database.connection));

    for (const query of ["Technology", "Docker"]) {
      const result = await service.getCatalog(query);
      expect(result.courses.map((course) => course.title)).toEqual(["Container Fundamentals"]);
    }

    const instructorResult = await service.getCatalog("Jane Smith");
    expect(instructorResult.courses.map((course) => course.title)).toEqual([
      "Container Fundamentals",
      "Guard Retention",
    ]);
  });

  it("filters by an exact instructor and lists instructor counts", async () => {
    const service = createCatalogService(createCatalogApiRepository(database.connection));

    await expect(service.getCatalog(undefined, undefined, "Jane Smith")).resolves.toMatchObject({
      courses: [{ title: "Container Fundamentals" }, { title: "Guard Retention" }],
      instructors: [
        { name: "Jane Smith", courseCount: 2 },
        { name: "John Doe", courseCount: 1 },
      ],
    });

    await expect(service.getCatalog(undefined, undefined, "Jane")).resolves.toMatchObject({
      courses: [],
    });
  });
});
