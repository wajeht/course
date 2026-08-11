import { configuration } from "../configuration.js";
import { createLogger } from "../logger.js";
import { createDatabase } from "./db.js";

const database = await createDatabase(configuration, createLogger());
await database.close();
