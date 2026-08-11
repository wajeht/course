export interface PlaybackSession {
  lessonId: string;
  positionSeconds: number;
  queuedPositionSeconds: number;
  pendingSaveCount: number;
  ready: boolean;
  saveQueue: Promise<void>;
}

export type ProgressSaver = (lessonId: string, positionSeconds: number) => Promise<void>;

export function createPlaybackSession(lessonId: string, positionSeconds: number): PlaybackSession {
  return {
    lessonId,
    positionSeconds,
    queuedPositionSeconds: positionSeconds,
    pendingSaveCount: 0,
    ready: false,
    saveQueue: Promise.resolve(),
  };
}

export function activatePlaybackSession(session: PlaybackSession, positionSeconds: number): void {
  session.positionSeconds = positionSeconds;
  session.queuedPositionSeconds = positionSeconds;
  session.ready = true;
}

export function stopPlaybackSession(session: PlaybackSession): void {
  session.ready = false;
}

export function recordPlaybackPosition(session: PlaybackSession, positionSeconds: number): void {
  if (!session.ready || !Number.isFinite(positionSeconds) || positionSeconds < 0) return;
  session.positionSeconds = positionSeconds;
}

export function exitPlaybackPosition(session: PlaybackSession): number | null {
  if (!session.ready || session.pendingSaveCount > 0 || session.positionSeconds <= 0) return null;
  return session.positionSeconds;
}

export async function persistPlaybackProgress(
  session: PlaybackSession,
  saver: ProgressSaver,
  force = false,
): Promise<void> {
  if (!session.ready) return;
  const position = session.positionSeconds;
  if (position <= 0) return;
  if (position === session.queuedPositionSeconds) {
    if (force) await session.saveQueue;
    return;
  }
  if (!force && Math.abs(position - session.queuedPositionSeconds) < 10) return;

  const previousQueuedPosition = session.queuedPositionSeconds;
  session.queuedPositionSeconds = position;
  session.pendingSaveCount++;
  const request = session.saveQueue.then(() => saver(session.lessonId, position));
  session.saveQueue = request
    .catch(() => {
      if (session.queuedPositionSeconds === position) {
        session.queuedPositionSeconds = previousQueuedPosition;
      }
    })
    .finally(() => {
      session.pendingSaveCount--;
    });
  await session.saveQueue;
}
