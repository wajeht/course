import path from "node:path";

export const naturalCompare = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
}).compare;

export function displayName(filename: string): string {
  const extension = path.extname(filename);
  const withoutExtension = extension ? filename.slice(0, -extension.length) : filename;
  return withoutExtension
    .replace(/^\s*\d+\s*(?:[-_.]\s*)?/, "")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}
