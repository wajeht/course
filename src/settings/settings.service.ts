import { libraryPageSizeSchema } from "./settings.schema.js";
import type { SettingsRepository } from "./settings.repository.js";

const LIBRARY_PAGE_SIZE_KEY = "library_page_size";

export type LibraryPageSize = 12 | 24 | 48 | 96;

export interface SettingsDto {
  libraryPageSize: LibraryPageSize;
}

export interface SettingsService {
  getSettings(): Promise<SettingsDto>;
  getLibraryPageSize(): Promise<LibraryPageSize>;
  updateSettings(settings: SettingsDto): Promise<SettingsDto>;
}

export function createSettingsService(repository: SettingsRepository): SettingsService {
  async function getLibraryPageSize(): Promise<LibraryPageSize> {
    return libraryPageSizeSchema.parse(Number(await repository.getValue(LIBRARY_PAGE_SIZE_KEY)));
  }

  return {
    getLibraryPageSize,
    async getSettings() {
      return { libraryPageSize: await getLibraryPageSize() };
    },
    async updateSettings(settings) {
      await repository.setValue(LIBRARY_PAGE_SIZE_KEY, String(settings.libraryPageSize));
      return settings;
    },
  };
}
