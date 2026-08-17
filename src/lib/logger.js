import pino from 'pino';

import { config, isProduction } from '../config/env.js';

/*
 * One shared Pino logger for the whole process. Production emits newline delimited
 * JSON, which log collectors parse directly, while development pipes the same
 * records through pino-pretty for readable output during work.
 */

// Credentials must never be written to a log file.
const REDACTED_PATHS = ['req.headers.authorization', 'req.headers.cookie'];

const prettyTransport = {
  target: 'pino-pretty',
  options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
};

export const logger = pino({
  level: config.logLevel,
  // Leaving the transport undefined keeps the raw JSON output in production.
  transport: isProduction ? undefined : prettyTransport,
  redact: REDACTED_PATHS,
});
