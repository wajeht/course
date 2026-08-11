import fs from "node:fs/promises";

import { configuration as defaultConfiguration, type Configuration } from "./configuration.js";
import { createDatabase, type Database } from "./db/db.js";
import {
  createCatalogRepository,
  type CatalogRepository as ScannerCatalogRepository,
} from "./media/catalog.repository.js";
import { createConversionManager, type ConversionManager } from "./media/conversion.js";
import { createConversionRepository } from "./media/conversion.repository.js";
import { createScanner, type Scanner } from "./media/scanner.js";
import {
  createCatalogApiRepository,
  type CatalogRepository,
} from "./routes/api/catalog/catalog.repository.js";
import { createCatalogService, type CatalogService } from "./routes/api/catalog/catalog.service.js";
import {
  createPlaybackService,
  type PlaybackService,
} from "./routes/api/playback/playback.service.js";
import { createProgressRepository } from "./routes/api/progress/progress.repository.js";
import {
  createProgressService,
  type ProgressService,
} from "./routes/api/progress/progress.service.js";
import { createLogger, type Logger } from "./logger.js";

export interface AppContext {
  configuration: Configuration;
  logger: Logger;
  database: Database;
  catalogRepository: CatalogRepository;
  scannerCatalogRepository: ScannerCatalogRepository;
  catalog: CatalogService;
  progress: ProgressService;
  playback: PlaybackService;
  scanner: Scanner;
  conversions: ConversionManager;
}

export async function createContext(
  configuration: Configuration = defaultConfiguration,
): Promise<AppContext> {
  const logger = createLogger();
  await Promise.all([
    fs.mkdir(configuration.media.dataDirectory, { recursive: true }),
    fs.mkdir(configuration.media.generatedCoversDirectory, { recursive: true }),
    fs.mkdir(configuration.media.hlsDirectory, { recursive: true }),
  ]);
  const database = await createDatabase(configuration, logger);
  const scannerCatalogRepository = createCatalogRepository(database.connection);
  const catalogRepository = createCatalogApiRepository(database.connection);
  const catalog = createCatalogService(catalogRepository);
  const progress = createProgressService(
    createProgressRepository(database.connection),
    catalogRepository,
  );
  const scanner = createScanner({ configuration, repository: scannerCatalogRepository, logger });
  const conversions = createConversionManager({
    repository: createConversionRepository(database.connection),
    catalog: catalogRepository,
    configuration,
    logger,
  });
  const playback = createPlaybackService(catalog, conversions);

  return {
    configuration,
    logger,
    database,
    catalogRepository,
    scannerCatalogRepository,
    catalog,
    progress,
    playback,
    scanner,
    conversions,
  };
}
