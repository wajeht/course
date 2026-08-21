import { z } from "zod";

export const libraryPageSizeSchema = z.union([
  z.literal(12),
  z.literal(24),
  z.literal(48),
  z.literal(96),
]);

export const settingsSchema = z.object({
  libraryPageSize: libraryPageSizeSchema,
});

export const updateSettingsSchema = settingsSchema;
