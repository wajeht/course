import { pathToFileURL } from "node:url";

import { serve, type ServerType } from "@hono/node-server";

import { createApp } from "./app.js";
import { createContext, type AppContext } from "./context.js";
import { logCause } from "./logger.js";

export interface ServerInfo {
  server: ServerType;
  context: AppContext;
  stopMonitoring: () => void;
  startupTasks: Promise<void>;
}

async function runStartupTasks(context: AppContext): Promise<void> {
  try {
    const scan = await context.scanner.scanLibrary();
    if (scan.status === "failed")
      context.logger.warn("Using the previous library after startup scan failed", {
        error: scan.error,
      });
  } catch (error) {
    context.logger.error("Startup library scan failed", { error: logCause(error) });
  }

  try {
    await context.conversions.recoverConversions();
  } catch (error) {
    context.logger.error("Conversion recovery failed", { error: logCause(error) });
  }
}

function scheduleStartupTasks(context: AppContext): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(() => {
      void runStartupTasks(context).then(
        () => resolve(),
        () => resolve(),
      );
    });
  });
}

export async function startServer(context: AppContext): Promise<ServerInfo> {
  const app = createApp(context);
  const server = serve({
    fetch: app.fetch,
    hostname: context.configuration.app.host,
    port: context.configuration.app.port,
  });
  context.logger.info("Server listening", {
    host: context.configuration.app.host,
    port: context.configuration.app.port,
  });

  let stopMonitoring = () => {};
  try {
    stopMonitoring = context.scanner.startMonitoring();
  } catch (error) {
    context.logger.warn("Library monitoring unavailable", { error: logCause(error) });
  }

  const startupTasks = scheduleStartupTasks(context);
  return { server, context, stopMonitoring, startupTasks };
}

export async function stopServer(info: ServerInfo): Promise<void> {
  info.stopMonitoring();
  await new Promise<void>((resolve, reject) => {
    info.server.close((error) => (error ? reject(error) : resolve()));
  });
  await info.startupTasks;
  await info.context.database.close();
}

async function runApplication(): Promise<void> {
  process.title = "videos";
  const context = await createContext();
  const info = await startServer(context);
  let stopping = false;
  const stopApplication = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    context.logger.info("Shutting down", { signal });
    const timeout = setTimeout(() => process.exit(1), 10_000);
    timeout.unref();
    try {
      await stopServer(info);
      clearTimeout(timeout);
      process.exit(0);
    } catch (error) {
      context.logger.error("Graceful shutdown failed", { error: logCause(error) });
      process.exit(1);
    }
  };

  for (const signal of ["SIGINT", "SIGTERM", "SIGQUIT"] as const) {
    process.on(signal, () => void stopApplication(signal));
  }
  process.on("uncaughtException", (error) => {
    context.logger.error("Uncaught exception", { error });
    process.exit(1);
  });
  process.on("unhandledRejection", (error) => {
    context.logger.error("Unhandled rejection", { error: logCause(error) });
    process.exit(1);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runApplication();
}
