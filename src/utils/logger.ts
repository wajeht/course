export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

function serializeError(value: unknown): unknown {
  if (!(value instanceof Error)) return value;
  return {
    name: value.name,
    message: value.message,
    stack: value.stack,
    cause: serializeError(value.cause),
  };
}

function write(level: string, message: string, fields: LogFields = {}): void {
  const normalizedFields = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, serializeError(value)]),
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
    debug: (message, fields) => write("debug", message, fields),
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields),
    error: (message, fields) => write("error", message, fields),
  };
}
