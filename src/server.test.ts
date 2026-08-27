import { once } from "node:events";
import fs from "node:fs/promises";
import type { AddressInfo } from "node:net";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createConfiguration } from "./config.js";
import { createContext } from "./context.js";
import type { ScanStatus } from "./media/types.js";
import { startServer, stopServer } from "./server.js";
import { createTemporaryDirectory } from "./test/resources.js";

describe("server", () => {
  it("serves requests while startup maintenance runs", async () => {
    const directory = await createTemporaryDirectory("videos-server-");
    const videos = path.join(directory, "videos");
    await fs.mkdir(videos);
    const configuration = createConfiguration({
      APP_ENV: "testing",
      APP_HOST: "127.0.0.1",
      APP_PORT: "3000",
      VIDEOS_DIR: videos,
      DATA_DIR: path.join(directory, "data"),
    });
    configuration.app.port = 0;
    const context = await createContext(configuration);
    const scanResult: ScanStatus = {
      status: "complete",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      playlistCount: 0,
      videoCount: 0,
      warnings: [],
      error: null,
    };
    let finishScan!: (result: ScanStatus) => void;
    const pendingScan = new Promise<ScanStatus>((resolve) => {
      finishScan = resolve;
    });
    vi.spyOn(context.scanner, "scanLibrary").mockReturnValue(pendingScan);
    const stopMonitoring = vi.fn();
    vi.spyOn(context.scanner, "startMonitoring").mockReturnValue(stopMonitoring);
    const recoverConversions = vi
      .spyOn(context.conversions, "recoverConversions")
      .mockResolvedValue();

    const info = await startServer(context);
    try {
      if (!info.server.listening) await once(info.server, "listening");
      const { port } = info.server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ status: "ok" });
      expect(recoverConversions).not.toHaveBeenCalled();

      finishScan(scanResult);
      await info.startupTasks;
      expect(recoverConversions).toHaveBeenCalledOnce();
    } finally {
      finishScan(scanResult);
      await stopServer(info);
    }

    expect(stopMonitoring).toHaveBeenCalledOnce();
  });
});
