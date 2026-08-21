import { describe, expect, it } from "vitest";

import { catalogQuerySchema } from "./catalog.schema.js";

describe("catalogQuerySchema", () => {
  it("normalizes single and repeated filter parameters to arrays", () => {
    expect(
      catalogQuerySchema.parse({
        category: ["Technology", "Martial Arts"],
        author: "Jane Smith",
      }),
    ).toMatchObject({
      category: ["Technology", "Martial Arts"],
      author: ["Jane Smith"],
    });
  });
});
