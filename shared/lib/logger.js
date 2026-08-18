import { createRequire } from 'node:module';
import process from 'node:process';

import pino from 'pino';

import { config, isProduction } from '../config/env.js';
import { mongoLogStream } from './mongoLogStream.js';

/*
 * One logger for the whole process, writing to two places at once: the console
 * for whoever is watching, and the logs collection in MongoDB, which the brief
 * requires. pino.multistream is what lets a single record reach both.
 */

// Keep credentials out of the logs.
const REDACTED_PATHS = ['req.headers.authorization', 'req.headers.cookie'];

/**
 * Builds the console stream.
 *
 * pino-pretty is a dev dependency, so an install made with --omit=dev leaves it
 * absent. Falling back to stdout keeps the process alive rather than throwing.
 *
 * @returns {object} A writable stream for pino.
 */
function createConsoleStream() {
  // Production wants the raw JSON that log collectors parse.
  if (isProduction) {
    return process.stdout;
  }

  // require.resolve is the only way to ask whether an optional package is there.
  const require = createRequire(import.meta.url);

  try {
    const createPrettyStream = require('pino-pretty');

    // Short timestamps, no pid or hostname: the noise is not useful locally.
    return createPrettyStream({
      colorize: true,
      translateTime: 'SYS:HH:MM:ss',
      ignore: 'pid,hostname',
    });
  } catch {
    // Not installed, so plain JSON it is.
    return process.stdout;
  }
}

// Both streams take the configured level; multistream would otherwise default to info.
const destinations = [
  { level: config.logLevel, stream: createConsoleStream() },
  { level: config.logLevel, stream: mongoLogStream },
];

export const logger = pino(
  { level: config.logLevel, redact: REDACTED_PATHS },
  pino.multistream(destinations),
);
