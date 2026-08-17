import type { CatalogDto, CatalogFilters } from "@/api.js";

const catalogCacheKey = "course:catalog-snapshot:v1";

export interface CatalogSnapshot {
  catalog: CatalogDto;
  savedAt: string;
}

export function isDefaultCatalogRequest(filters: CatalogFilters = {}): boolean {
  return (
    !filters.category &&
    !filters.instructor &&
    !filters.query &&
    !filters.tag &&
    (filters.page === undefined || filters.page === 1)
  );
}

export function readCatalogSnapshot(): CatalogSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(
      window.localStorage.getItem(catalogCacheKey) ?? "null",
    ) as CatalogSnapshot;
    if (!value?.savedAt || !Array.isArray(value.catalog?.courses)) return null;
    return value;
  } catch {
    return null;
  }
}

export function writeCatalogSnapshot(catalog: CatalogDto): void {
  if (typeof window === "undefined") return;
  const { offline: _offline, ...onlineCatalog } = catalog;
  try {
    window.localStorage.setItem(
      catalogCacheKey,
      JSON.stringify({ catalog: onlineCatalog, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Storage can be unavailable or full; online catalog use should continue normally.
  }
}

export function clearCatalogSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(catalogCacheKey);
  } catch {
    // Clearing browser storage is best effort.
  }
}
