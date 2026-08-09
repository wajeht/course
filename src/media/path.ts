import path from "node:path";

export function resolveContainedPath(root: string, relativePath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  const relative = path.relative(resolvedRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path leaves the configured media directory");
  }
  return resolved;
}

export function posixPath(value: string): string {
  return value.split(path.sep).join("/");
}
