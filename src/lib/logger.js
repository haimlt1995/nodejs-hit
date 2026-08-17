import { createRequire } from 'node:module';

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

/**
 * Reports whether the optional pino-pretty package can actually be loaded.
 *
 * pino-pretty is a development dependency, so an install made with --omit=dev
 * leaves it absent. Pino throws while building a transport it cannot resolve, and
 * that would kill the process on startup. Probing first keeps a deployment that
 * forgets to set NODE_ENV running, merely logging raw JSON instead.
 *
 * @returns {boolean} True when the package is installed and resolvable.
 */
function isPrettyTransportAvailable() {
  const require = createRequire(import.meta.url);

  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    // Not installed, so the caller falls back to plain JSON output.
    return false;
  }
}

// Pretty output is for development only, and only when the package is present.
const shouldUsePretty = !isProduction && isPrettyTransportAvailable();

export const logger = pino({
  level: config.logLevel,
  // Leaving the transport undefined keeps the raw JSON output.
  transport: shouldUsePretty ? prettyTransport : undefined,
  redact: REDACTED_PATHS,
});
