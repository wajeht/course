import { Hono } from "hono";

import type { AppContext } from "../context.js";

export function createScanRouter(context: AppContext) {
  return new Hono()
    .basePath("/scan")
    .get("/", (c) => c.json(context.scanner.scanStatus()))
    .post("/", async (c) => c.json(await context.scanner.scanLibrary()));
}
