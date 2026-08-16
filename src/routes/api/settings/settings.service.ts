import { catalogPageSizeSchema } from "./settings.schema.js";
import type { SettingsRepository } from "./settings.repository.js";

const CATALOG_PAGE_SIZE_KEY = "catalog_page_size";

export type CatalogPageSize = 12 | 24 | 48 | 96;

export interface SettingsDto {
  catalogPageSize: CatalogPageSize;
}

export interface SettingsService {
  getSettings(): Promise<SettingsDto>;
  getCatalogPageSize(): Promise<CatalogPageSize>;
  updateSettings(settings: SettingsDto): Promise<SettingsDto>;
}

export function createSettingsService(repository: SettingsRepository): SettingsService {
  async function getCatalogPageSize(): Promise<CatalogPageSize> {
    return catalogPageSizeSchema.parse(Number(await repository.getValue(CATALOG_PAGE_SIZE_KEY)));
  }

  return {
    getCatalogPageSize,
    async getSettings() {
      return { catalogPageSize: await getCatalogPageSize() };
    },
    async updateSettings(settings) {
      await repository.setValue(CATALOG_PAGE_SIZE_KEY, String(settings.catalogPageSize));
      return settings;
    },
  };
}
