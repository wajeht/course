export type LogValue = boolean | Error | null | number | string | undefined;
export type LogFields = Record<string, LogValue>;

interface SerializedError {
  cause: LogValue | SerializedError;
  message: string;
  name: string;
  stack?: string;
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

export function logCause(cause: unknown): LogValue {
  if (cause instanceof Error) return cause;
  if (cause === undefined || cause === null) return cause;
  return String(cause);
}

function errorValue(value: LogValue): LogValue | SerializedError {
  if (!(value instanceof Error)) return value;
  return {
    name: value.name,
    message: value.message,
    stack: value.stack,
    cause: errorValue(logCause(value.cause)),
  };
}

function writeLog(level: string, message: string, fields: LogFields = {}): void {
  const normalizedFields = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, errorValue(value)]),
  );
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...normalizedFields,
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger(): Logger {
  return {
    debug: (message, fields) => writeLog("debug", message, fields),
    info: (message, fields) => writeLog("info", message, fields),
    warn: (message, fields) => writeLog("warn", message, fields),
    error: (message, fields) => writeLog("error", message, fields),
  };
}
