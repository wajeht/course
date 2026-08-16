import { Hono } from "hono";

import type { AppContext } from "../../../context.js";

export function createScanRouter(context: AppContext) {
  return new Hono()
    .get("/", (c) => c.json(context.scanner.getScanStatus()))
    .post("/", async (c) => c.json(await context.scanner.scanCatalog()));
}
