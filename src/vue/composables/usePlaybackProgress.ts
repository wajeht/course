interface PlaybackSession {
  videoId: string;
  positionSeconds: number;
  queuedPositionSeconds: number;
  pendingSaveCount: number;
  ready: boolean;
  saveQueue: Promise<void>;
}

export interface PlaybackProgressSnapshot {
  videoId: string;
  positionSeconds: number;
}

export type ProgressSaver = (videoId: string, positionSeconds: number) => Promise<void>;
export type ProgressResetter = (videoId: string) => Promise<void>;

export function usePlaybackProgress(saver: ProgressSaver) {
  let session: PlaybackSession | null = null;

  function startSession(videoId: string, positionSeconds: number): void {
    session = {
      videoId,
      positionSeconds,
      queuedPositionSeconds: positionSeconds,
      pendingSaveCount: 0,
      ready: false,
      saveQueue: Promise.resolve(),
    };
  }

  function isSessionFor(videoId: string): boolean {
    return session?.videoId === videoId;
  }

  function activateSession(positionSeconds: number): void {
    if (!session) return;
    session.positionSeconds = positionSeconds;
    session.queuedPositionSeconds = positionSeconds;
    session.ready = true;
  }

  function stopSession(): void {
    if (!session) return;
    session.ready = false;
  }

  function clearSession(): void {
    stopSession();
    session = null;
  }

  function recordPosition(positionSeconds: number | undefined): void {
    if (
      !session?.ready ||
      positionSeconds === undefined ||
      !Number.isFinite(positionSeconds) ||
      positionSeconds < 0
    ) {
      return;
    }
    session.positionSeconds = positionSeconds;
  }

  async function persistProgress(force = false): Promise<void> {
    const activeSession = session;
    if (!activeSession?.ready) return;
    const position = activeSession.positionSeconds;
    if (position <= 0) return;
    if (position === activeSession.queuedPositionSeconds) {
      if (force) await activeSession.saveQueue;
      return;
    }
    if (!force && Math.abs(position - activeSession.queuedPositionSeconds) < 10) return;

    const previousQueuedPosition = activeSession.queuedPositionSeconds;
    activeSession.queuedPositionSeconds = position;
    activeSession.pendingSaveCount++;
    const request = activeSession.saveQueue.then(() => saver(activeSession.videoId, position));
    activeSession.saveQueue = request
      .catch(() => {
        if (activeSession.queuedPositionSeconds === position) {
          activeSession.queuedPositionSeconds = previousQueuedPosition;
        }
      })
      .finally(() => {
        activeSession.pendingSaveCount--;
      });
    await activeSession.saveQueue;
  }

  async function finishSession(positionSeconds: number | undefined): Promise<void> {
    const activeSession = session;
    recordPosition(positionSeconds);
    await persistProgress(true);
    if (session === activeSession) stopSession();
  }

  function captureExitSnapshot(
    positionSeconds: number | undefined,
  ): PlaybackProgressSnapshot | null {
    recordPosition(positionSeconds);
    if (!session?.ready || session.pendingSaveCount > 0 || session.positionSeconds <= 0)
      return null;
    return {
      videoId: session.videoId,
      positionSeconds: session.positionSeconds,
    };
  }

  async function resetSession(
    positionSeconds: number | undefined,
    resetter: ProgressResetter,
  ): Promise<void> {
    const activeSession = session;
    if (!activeSession) return;
    recordPosition(positionSeconds);
    const previousPosition = activeSession.positionSeconds;
    stopSession();
    try {
      await activeSession.saveQueue;
      await resetter(activeSession.videoId);
      if (session === activeSession) activateSession(0);
    } catch (error) {
      if (session === activeSession) activateSession(previousPosition);
      throw error;
    }
  }

  return {
    activateSession,
    captureExitSnapshot,
    clearSession,
    finishSession,
    isSessionFor,
    persistProgress,
    recordPosition,
    resetSession,
    startSession,
    stopSession,
  };
}
