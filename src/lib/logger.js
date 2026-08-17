import { createRequire } from 'node:module';

import pino from 'pino';

import { config, isProduction } from '../config/env.js';

/*
 * One logger for the whole process. JSON in production, pretty lines while
 * developing.
 */

// Keep credentials out of the logs.
const REDACTED_PATHS = ['req.headers.authorization', 'req.headers.cookie'];

const prettyTransport = {
  target: 'pino-pretty',
  options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
};

/**
 * Checks whether pino-pretty is installed.
 *
 * It is a dev dependency, so --omit=dev drops it. Pino throws on a transport it
 * cannot resolve, and that throw would kill the process at startup.
 *
 * @returns {boolean} True when the package resolves.
 */
function isPrettyTransportAvailable() {
  const require = createRequire(import.meta.url);

  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    // Missing, so fall back to JSON.
    return false;
  }
}

// Pretty output only in development, and only if the package is there.
const shouldUsePretty = !isProduction && isPrettyTransportAvailable();

export const logger = pino({
  level: config.logLevel,
  // An undefined transport means raw JSON.
  transport: shouldUsePretty ? prettyTransport : undefined,
  redact: REDACTED_PATHS,
});
