/**
 * 結構化日誌模組
 *
 * 使用 pino 提供高效能的結構化日誌記錄
 * 支援不同環境的格式輸出：開發環境可讀格式、生產環境 JSON 格式
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
}

/**
 * 取得當前日誌級別
 */
function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  if (level === "debug" || level === "info" || level === "warn" || level === "error") {
    return level;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

/**
 * 判斷日誌級別是否應該輸出
 */
function shouldLog(level: LogLevel): boolean {
  const levels: LogLevel[] = ["debug", "info", "warn", "error"];
  const currentLevel = getLogLevel();
  return levels.indexOf(level) >= levels.indexOf(currentLevel);
}

/**
 * 格式化日誌輸出
 */
function formatLog(entry: LogEntry): string {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    // 開發環境：可讀格式
    const levelColors: Record<LogLevel, string> = {
      debug: "\x1b[36m", // cyan
      info: "\x1b[32m",  // green
      warn: "\x1b[33m",  // yellow
      error: "\x1b[31m", // red
    };
    const reset = "\x1b[0m";
    const color = levelColors[entry.level];
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    return `${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}${contextStr}`;
  }

  // 生產環境：JSON 格式
  return JSON.stringify(entry);
}

/**
 * 輸出日誌
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && { context }),
  };

  const output = formatLog(entry);

  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

/**
 * Logger 實例
 *
 * @example
 * ```typescript
 * import { logger } from "@/lib/logger";
 *
 * logger.info("User logged in", { userId: "123" });
 * logger.error("Database connection failed", { error: err.message });
 * ```
 */
export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),

  /**
   * 建立帶有預設 context 的 child logger
   */
  child: (defaultContext: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      log("debug", message, { ...defaultContext, ...context }),
    info: (message: string, context?: LogContext) =>
      log("info", message, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      log("warn", message, { ...defaultContext, ...context }),
    error: (message: string, context?: LogContext) =>
      log("error", message, { ...defaultContext, ...context }),
  }),
};

/**
 * API 請求/回應日誌裝飾器
 */
export function withApiLogging<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  const requestLogger = logger.child({ api: name });

  requestLogger.debug("API request started");

  return fn()
    .then((result) => {
      requestLogger.info("API request completed", { duration: Date.now() - start });
      return result;
    })
    .catch((error) => {
      requestLogger.error("API request failed", {
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    });
}
