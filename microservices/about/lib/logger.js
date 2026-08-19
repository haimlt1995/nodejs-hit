import { createRequire } from 'node:module';
import process from 'node:process';

import pino from 'pino';

import { config, isProduction } from '../config/env.js';
import { mongoLogStream } from './mongoLogStream.js';

// never write these to a log
const REDACTED_PATHS = ['req.headers.authorization', 'req.headers.cookie'];

// picks how log lines look on screen
function createConsoleStream() {
  if (isProduction) {
    return process.stdout;
  }

  const require = createRequire(import.meta.url);

  try {
    const createPrettyStream = require('pino-pretty');

    // colours and a short clock, easier to read while working
    return createPrettyStream({
      colorize: true,
      translateTime: 'SYS:HH:MM:ss',
      ignore: 'pid,hostname',
    });
  } catch {
    // pino-pretty is not installed here, plain json will do
    return process.stdout;
  }
}

// every log line goes to the screen and to the database
const destinations = [
  { level: config.logLevel, stream: createConsoleStream() },
  { level: config.logLevel, stream: mongoLogStream },
];

export const logger = pino(
  { level: config.logLevel, redact: REDACTED_PATHS },
  pino.multistream(destinations),
);
