export type LogValue = string | number | boolean | null | undefined | Error | LogValue[];
export interface LogFields {
  [key: string]: LogValue;
}

type SerializedLogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | SerializedLogValue[]
  | {
      name: string;
      message: string;
      stack?: string;
      cause?: SerializedLogValue;
    };

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

function errorValue(value: LogValue): SerializedLogValue {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause:
        value.cause instanceof Error
          ? errorValue(value.cause)
          : value.cause === undefined
            ? undefined
            : String(value.cause),
    };
  }
  if (Array.isArray(value)) return value.map(errorValue);
  return value;
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
