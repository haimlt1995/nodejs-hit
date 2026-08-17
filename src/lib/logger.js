import pino from 'pino';

import { config, isProduction } from '../config/env.js';

export const logger = pino({
  level: config.logLevel,
  // Structured JSON in production; human-readable lines while developing.
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});
