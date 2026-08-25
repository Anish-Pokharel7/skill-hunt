type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "SECURITY";

interface LogMeta {
  userId?: string;
  userRole?: string;
  orgId?: string;
  action?: string;
  path?: string;
  ip?: string;
  durationMs?: number;
  [key: string]: unknown;
}

class Logger {
  private isDev = process.env.NODE_ENV !== "production";

  private formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    if (this.isDev) {
      const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
      return `[${timestamp}] [${level}] ${message}${metaStr}`;
    }
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    });
  }

  public debug(message: string, meta?: LogMeta) {
    if (this.isDev) {
      console.debug(this.formatMessage("DEBUG", message, meta));
    }
  }

  public info(message: string, meta?: LogMeta) {
    console.log(this.formatMessage("INFO", message, meta));
  }

  public warn(message: string, meta?: LogMeta) {
    console.warn(this.formatMessage("WARN", message, meta));
  }

  public error(message: string, error?: Error | unknown, meta?: LogMeta) {
    const errorDetails =
      error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
        : { errorDetails: String(error) };

    console.error(
      this.formatMessage("ERROR", message, {
        ...meta,
        ...errorDetails,
      })
    );
  }

  public security(action: string, details: string, meta?: LogMeta) {
    console.warn(
      this.formatMessage("SECURITY", `[SECURITY AUDIT] ${action}: ${details}`, {
        ...meta,
        action,
      })
    );
  }
}

export const logger = new Logger();
export default logger;
