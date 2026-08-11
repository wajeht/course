import { describe, expect, it, vi } from "vitest";

import {
  activatePlaybackSession,
  createPlaybackSession,
  exitPlaybackPosition,
  persistPlaybackProgress,
  recordPlaybackPosition,
  stopPlaybackSession,
} from "./playback-session.js";

describe("playback session", () => {
  it("records and saves positions only while the session is active", async () => {
    const saver = vi.fn(async () => undefined);
    const session = createPlaybackSession("lesson", 0);

    recordPlaybackPosition(session, 30);
    await persistPlaybackProgress(session, saver, true);
    expect(saver).not.toHaveBeenCalled();

    activatePlaybackSession(session, 0);
    recordPlaybackPosition(session, 30);
    await persistPlaybackProgress(session, saver, true);
    expect(saver).toHaveBeenCalledWith("lesson", 30);

    stopPlaybackSession(session);
    recordPlaybackPosition(session, 0);
    await persistPlaybackProgress(session, saver, true);
    expect(session.positionSeconds).toBe(30);
    expect(saver).toHaveBeenCalledTimes(1);
  });

  it("does not persist zero as playback progress", async () => {
    const saver = vi.fn(async () => undefined);
    const session = createPlaybackSession("lesson", 0);
    activatePlaybackSession(session, 0);

    await persistPlaybackProgress(session, saver, true);

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
    const session = createPlaybackSession("lesson", 0);
    activatePlaybackSession(session, 0);

    recordPlaybackPosition(session, 10);
    const firstSave = persistPlaybackProgress(session, saver, true);
    recordPlaybackPosition(session, 20);
    const secondSave = persistPlaybackProgress(session, saver, true);
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
    const session = createPlaybackSession("lesson", 0);
    activatePlaybackSession(session, 0);
    recordPlaybackPosition(session, 10);

    const save = persistPlaybackProgress(session, saver, true);
    recordPlaybackPosition(session, 15);
    expect(exitPlaybackPosition(session)).toBeNull();

    releaseSave?.();
    await save;
    expect(exitPlaybackPosition(session)).toBe(15);
  });

  it("awaits an identical queued position without saving it twice", async () => {
    let releaseSave: (() => void) | undefined;
    const request = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const saver = vi.fn(async () => request);
    const session = createPlaybackSession("lesson", 0);
    activatePlaybackSession(session, 0);
    recordPlaybackPosition(session, 10);

    const firstSave = persistPlaybackProgress(session, saver, true);
    const finalSave = persistPlaybackProgress(session, saver, true);
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
    const session = createPlaybackSession("lesson", 0);
    activatePlaybackSession(session, 0);
    recordPlaybackPosition(session, 15);

    await persistPlaybackProgress(session, saver, true);
    await persistPlaybackProgress(session, saver, true);

    expect(saver).toHaveBeenCalledTimes(2);
  });
});
