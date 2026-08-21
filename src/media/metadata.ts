import { z } from "zod";

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeMetadataName(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeMetadataName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export const metadataNameSchema = z.string().trim().min(1);
export const metadataNamesSchema = z
  .array(metadataNameSchema.max(200))
  .max(50)
  .transform(uniqueValues);

export const sourceMetadataSchema = z
  .object({
    provider: metadataNameSchema.max(200),
    url: z.url(),
  })
  .strict();
