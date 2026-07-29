export type LogLevel = "error" | "info" | "warn";

export type LogEntry = {
  event: string;
  level: LogLevel;
  timestamp: string;
} & Record<string, unknown>;

export type AppLogger = {
  error: (event: string, fields?: Record<string, unknown>) => void;
  info: (event: string, fields?: Record<string, unknown>) => void;
  warn: (event: string, fields?: Record<string, unknown>) => void;
};

export type ConsoleLoggerOptions = {
  clock?: () => Date;
  sink?: (entry: LogEntry) => void;
};

const redactedValue = "[REDACTED]";

export const noopLogger: AppLogger = {
  error: () => {},
  info: () => {},
  warn: () => {}
};

export function createConsoleLogger(
  options: ConsoleLoggerOptions = {}
): AppLogger {
  const clock = options.clock ?? (() => new Date());
  const sink = options.sink ?? writeConsoleEntry;

  const write = (
    level: LogLevel,
    event: string,
    fields: Record<string, unknown> = {}
  ) => {
    const safeFields = redactSensitiveData(fields);

    sink({
      ...(isRecord(safeFields) ? safeFields : {}),
      event,
      level,
      timestamp: clock().toISOString()
    });
  };

  return {
    error: (event, fields) => write("error", event, fields),
    info: (event, fields) => write("info", event, fields),
    warn: (event, fields) => write("warn", event, fields)
  };
}

export function logSafely(
  logger: AppLogger,
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {}
) {
  try {
    logger[level](event, fields);
  } catch {
    // Observability must never change request behavior.
  }
}

export function redactSensitiveData(value: unknown): unknown {
  return redactValue(value, new WeakSet<object>());
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }

  if (typeof value === "string") {
    return redactString(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "undefined") {
    return undefined;
  }

  if (typeof value === "function" || typeof value === "symbol") {
    return "[UNSUPPORTED]";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name
    };
  }

  if (seen.has(value)) {
    return "[CIRCULAR]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen));
  }

  const result: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    result[key] = isSensitiveKey(key) ? redactedValue : redactValue(item, seen);
  }

  return result;
}

function isSensitiveKey(key: string) {
  const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();

  return (
    normalizedKey === "authorization" ||
    normalizedKey === "cookie" ||
    normalizedKey === "setcookie" ||
    normalizedKey === "token" ||
    normalizedKey === "accesstoken" ||
    normalizedKey === "refreshtoken" ||
    normalizedKey === "idtoken" ||
    normalizedKey === "apikey" ||
    normalizedKey.endsWith("apikey") ||
    normalizedKey === "password" ||
    normalizedKey.endsWith("password") ||
    normalizedKey === "secret" ||
    normalizedKey.endsWith("secret") ||
    normalizedKey === "databaseurl"
  );
}

function redactString(value: string) {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, redactedValue)
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, redactedValue)
    .replace(
      /([a-z][a-z0-9+.-]*:\/\/[^/\s:@]+):([^@\s/]+)@/gi,
      `$1:${redactedValue}@`
    )
    .replace(
      /([?&](?:api[_-]?key|access[_-]?token|token|key)=)[^&#\s]+/gi,
      `$1${redactedValue}`
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function writeConsoleEntry(entry: LogEntry) {
  const serializedEntry = JSON.stringify(entry);

  if (entry.level === "error") {
    console.error(serializedEntry);
    return;
  }

  if (entry.level === "warn") {
    console.warn(serializedEntry);
    return;
  }

  console.info(serializedEntry);
}
