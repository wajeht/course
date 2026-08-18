import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppContext } from "../context.js";
import { settingsSchema, updateSettingsSchema } from "./settings.schema.js";

export function createSettingsRouter(context: AppContext) {
  return new Hono()
    .get("/", async (c) => c.json(settingsSchema.parse(await context.settings.getSettings())))
    .put("/", zValidator("json", updateSettingsSchema), async (c) =>
      c.json(settingsSchema.parse(await context.settings.updateSettings(c.req.valid("json")))),
    );
}
