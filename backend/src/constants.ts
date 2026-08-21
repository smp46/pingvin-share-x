import { LogLevel } from "@nestjs/common";

export const CONFIG_FILE = process.env.CONFIG_FILE || "../config.yaml";

export const DATA_DIRECTORY = process.env.DATA_DIRECTORY || "./data";
export const SHARE_DIRECTORY = `${DATA_DIRECTORY}/uploads/shares`;
export const DATABASE_URL =
  process.env.DATABASE_URL ||
  "file:../data/pingvin-share.db?connection_limit=1";
export const CLAMAV_HOST =
  process.env.CLAMAV_HOST ||
  (process.env.NODE_ENV == "docker" ? "clamav" : "127.0.0.1");
export const CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT) || 3310;

// Turns off the request rate limits. Only for running the integration suite,
// which otherwise burns through the 20 auth calls per 5 minutes. Never set
// this on a reachable instance, it is what stops password guessing.
export const RATE_LIMIT_DISABLED = process.env.DISABLE_RATE_LIMIT === "true";

export const LOG_LEVEL_AVAILABLE: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];
export const LOG_LEVEL_DEFAULT: LogLevel = process.env.NODE_ENV === 'development' ? "verbose" : "log";
export const LOG_LEVEL_ENV = `${process.env.PV_LOG_LEVEL || ""}`;