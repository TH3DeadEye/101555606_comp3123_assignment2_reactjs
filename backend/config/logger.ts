import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import { env } from './env';

fs.mkdirSync(env.LOG_DIR, { recursive: true });

// Safety net: even if a developer logs an object that contains a secret by
// mistake, values stored under these key names are replaced before writing.
const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|jwt/i;

function redactValue(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== 'object' || depth > 5) return value;
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactValue(item, depth + 1),
    ]),
  );
}

const redact = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (key === 'level' || key === 'message' || key === 'timestamp') continue;
    info[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactValue(info[key]);
  }
  return info;
});

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  redact(),
  winston.format.json(),
);

const prettyConsoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  redact(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const details = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${String(timestamp)} ${level}: ${String(message)}${details}${stack ? `\n${String(stack)}` : ''}`;
  }),
);

const appLog = path.join(env.LOG_DIR, 'app.log');
const errorLog = path.join(env.LOG_DIR, 'error.log');
const rotation = { maxsize: 5 * 1024 * 1024, maxFiles: 5, tailable: true };

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  silent: env.NODE_ENV === 'test',
  transports: [
    new winston.transports.File({ filename: appLog, format: fileFormat, ...rotation }),
    new winston.transports.File({ filename: errorLog, level: 'error', format: fileFormat, ...rotation }),
    new winston.transports.Console({
      format: env.NODE_ENV === 'production' ? fileFormat : prettyConsoleFormat,
    }),
  ],
  // Crashes are written to the log files before the process exits.
  exceptionHandlers: [new winston.transports.File({ filename: errorLog, format: fileFormat })],
  rejectionHandlers: [new winston.transports.File({ filename: errorLog, format: fileFormat })],
});

// Waits until every pending log line has been written. Call it before
// process.exit() so the last message (for example a startup failure) is kept.
export function flushLogs(): Promise<void> {
  return new Promise((resolve) => {
    logger.once('finish', () => resolve());
    logger.end();
  });
}
