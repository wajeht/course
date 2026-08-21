import { serve, type ServerType } from "@hono/node-server";

import { createApp } from "./app.js";
import { createContext, type AppContext } from "./context.js";

export interface ServerInfo {
  server: ServerType;
  context: AppContext;
  stopMonitoring: () => void;
}

export async function startServer(context: AppContext): Promise<ServerInfo> {
  const scan = await context.scanner.scanLibrary();
  if (scan.status === "failed")
    context.logger.warn("Starting with the previous library", { error: scan.error });
  await context.conversions.recoverConversions();
  const stopMonitoring = context.scanner.startMonitoring();
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
  return { server, context, stopMonitoring };
}

export async function stopServer(info: ServerInfo): Promise<void> {
  info.stopMonitoring();
  await new Promise<void>((resolve, reject) => {
    info.server.close((error) => (error ? reject(error) : resolve()));
  });
  await info.context.database.close();
}

async function runApplication(): Promise<void> {
  process.title = "course";
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
      context.logger.error("Graceful shutdown failed", { error });
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
    context.logger.error("Unhandled rejection", { error });
    process.exit(1);
  });
}

if (process.env.NODE_ENV !== "testing") {
  void runApplication();
}
