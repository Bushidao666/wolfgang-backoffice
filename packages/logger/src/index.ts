export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type LogMeta = Record<string, unknown>;

export type Logger = {
  trace(message: unknown, meta?: LogMeta): void;
  debug(message: unknown, meta?: LogMeta): void;
  info(message: unknown, meta?: LogMeta): void;
  warn(message: unknown, meta?: LogMeta): void;
  error(message: unknown, meta?: LogMeta): void;
  child(meta: LogMeta): Logger;
};

type LoggerOptions = {
  service: string;
  level?: LogLevel;
  base?: LogMeta;
  redactKeys?: string[];
};

const LEVELS: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

const DEFAULT_REDACT_KEYS = [
  "password",
  "pass",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "api_key",
  "apikey",
  "secret",
  "client_secret",
  "meta_access_token",
  "supabase_service_role_key",
];

function normalizeLevel(input: unknown): LogLevel {
  const raw = typeof input === "string" ? input.toLowerCase().trim() : "";
  if ((Object.keys(LEVELS) as LogLevel[]).includes(raw as LogLevel)) return raw as LogLevel;
  return "info";
}

function shouldLog(current: LogLevel, messageLevel: LogLevel): boolean {
  return LEVELS[messageLevel] >= LEVELS[current];
}

function serializeError(err: Error) {
  return { name: err.name, message: err.message, stack: err.stack };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function redact(value: unknown, redactKeys: Set<string>, seen: WeakSet<object>, depth: number): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return serializeError(value);
  if (depth <= 0) return "[Truncated]";

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, redactKeys, seen, depth - 1));
  }

  if (typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    if (!isPlainObject(value)) {
      try {
        return String(value);
      } catch {
        return "[Unserializable]";
      }
    }

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (redactKeys.has(k.toLowerCase())) {
        out[k] = "[REDACTED]";
        continue;
      }
      out[k] = redact(v, redactKeys, seen, depth - 1);
    }
    return out;
  }

  return String(value);
}

function buildLine(service: string, level: LogLevel, message: unknown, meta: LogMeta, redactKeys: Set<string>) {
  const seen = new WeakSet<object>();
  const safeMeta = redact(meta, redactKeys, seen, 6) as LogMeta;
  const safeMessage =
    message instanceof Error ? serializeError(message) : typeof message === "string" ? message : redact(message, redactKeys, seen, 6);

  return {
    timestamp: new Date().toISOString(),
    level,
    service,
    message: safeMessage,
    ...safeMeta,
  };
}

export function createLogger(options: LoggerOptions): Logger {
  const level = normalizeLevel(options.level ?? process.env.LOG_LEVEL ?? "info");
  const redactKeys = new Set((options.redactKeys ?? DEFAULT_REDACT_KEYS).map((k) => k.toLowerCase()));
  const base = options.base ?? {};

  const write = (msgLevel: LogLevel, message: unknown, meta?: LogMeta) => {
    if (!shouldLog(level, msgLevel)) return;
    const line = buildLine(options.service, msgLevel, message, { ...base, ...(meta ?? {}) }, redactKeys);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(line));
  };

  const logger: Logger = {
    trace: (message, meta) => write("trace", message, meta),
    debug: (message, meta) => write("debug", message, meta),
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta),
    child: (meta) => createLogger({ ...options, base: { ...base, ...meta } }),
  };

  return logger;
}

