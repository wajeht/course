import fs from "node:fs/promises";
import path from "node:path";

export async function resolveContainedPath(root: string, relativePath: string): Promise<string> {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  assertContainedPath(resolvedRoot, resolved);

  const [realRoot, realResolved] = await Promise.all([
    fs.realpath(resolvedRoot),
    fs.realpath(resolved),
  ]);
  assertContainedPath(realRoot, realResolved);
  return realResolved;
}

function assertContainedPath(root: string, candidate: string): void {
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path leaves the configured media directory");
  }
}

export function posixPath(value: string): string {
  return value.split(path.sep).join("/");
}
