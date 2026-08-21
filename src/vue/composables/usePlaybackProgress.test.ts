import { describe, expect, it, vi } from "vitest";

import { usePlaybackProgress } from "./usePlaybackProgress.js";

describe("usePlaybackProgress", () => {
  it("records and saves positions only while the session is active", async () => {
    const saver = vi.fn(async () => undefined);
    const progress = usePlaybackProgress(saver);
    progress.startSession("video", 0);

    progress.recordPosition(30);
    await progress.persistProgress(true);
    expect(saver).not.toHaveBeenCalled();

    progress.activateSession(0);
    progress.recordPosition(30);
    await progress.persistProgress(true);
    expect(saver).toHaveBeenCalledWith("video", 30);

    progress.stopSession();
    progress.recordPosition(0);
    await progress.persistProgress(true);
    expect(saver).toHaveBeenCalledTimes(1);
  });

  it("does not persist zero as playback progress", async () => {
    const saver = vi.fn(async () => undefined);
    const progress = usePlaybackProgress(saver);
    progress.startSession("video", 0);
    progress.activateSession(0);

    await progress.persistProgress(true);

    expect(saver).not.toHaveBeenCalled();
  });

  it("serializes saves so older positions cannot arrive last", async () => {
    let releaseFirst: (() => void) | undefined;
    const firstRequest = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const positions: number[] = [];
    const saver = vi.fn(async (_lessonId: string, position: number) => {
      positions.push(position);
      if (position === 10) await firstRequest;
    });
    const progress = usePlaybackProgress(saver);
    progress.startSession("video", 0);
    progress.activateSession(0);

    progress.recordPosition(10);
    const firstSave = progress.persistProgress(true);
    progress.recordPosition(20);
    const secondSave = progress.persistProgress(true);
    await Promise.resolve();
    expect(positions).toEqual([10]);

    releaseFirst?.();
    await Promise.all([firstSave, secondSave]);
    expect(positions).toEqual([10, 20]);
  });

  it("does not create an exit write while an older save is pending", async () => {
    let releaseSave: (() => void) | undefined;
    const request = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const saver = vi.fn(async () => request);
    const progress = usePlaybackProgress(saver);
    progress.startSession("video", 0);
    progress.activateSession(0);
    progress.recordPosition(10);

    const save = progress.persistProgress(true);
    expect(progress.captureExitSnapshot(15)).toBeNull();

    releaseSave?.();
    await save;
    expect(progress.captureExitSnapshot(15)).toEqual({
      lessonId: "video",
      positionSeconds: 15,
    });
  });

  it("awaits an identical queued position without saving it twice", async () => {
    let releaseSave: (() => void) | undefined;
    const request = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const saver = vi.fn(async () => request);
    const progress = usePlaybackProgress(saver);
    progress.startSession("video", 0);
    progress.activateSession(0);
    progress.recordPosition(10);

    const firstSave = progress.persistProgress(true);
    const finalSave = progress.persistProgress(true);
    await Promise.resolve();
    expect(saver).toHaveBeenCalledTimes(1);

    releaseSave?.();
    await Promise.all([firstSave, finalSave]);
    expect(saver).toHaveBeenCalledTimes(1);
  });

  it("retries a position after a failed save", async () => {
    const saver = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    const progress = usePlaybackProgress(saver);
    progress.startSession("video", 0);
    progress.activateSession(0);
    progress.recordPosition(15);

    await progress.persistProgress(true);
    await progress.persistProgress(true);

    expect(saver).toHaveBeenCalledTimes(2);
  });

  it("waits for pending saves before an explicit reset", async () => {
    let releaseSave: (() => void) | undefined;
    const request = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const events: string[] = [];
    const saver = vi.fn(async () => {
      events.push("save");
      await request;
    });
    const resetter = vi.fn(async () => {
      events.push("reset");
    });
    const progress = usePlaybackProgress(saver);
    progress.startSession("video", 0);
    progress.activateSession(0);
    progress.recordPosition(15);

    const save = progress.persistProgress(true);
    const reset = progress.resetSession(15, resetter);
    await Promise.resolve();
    expect(events).toEqual(["save"]);

    releaseSave?.();
    await Promise.all([save, reset]);
    expect(events).toEqual(["save", "reset"]);
    expect(resetter).toHaveBeenCalledWith("video");
    expect(progress.captureExitSnapshot(0)).toBeNull();
  });
});
