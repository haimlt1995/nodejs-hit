import process from 'node:process';

import mongoose from 'mongoose';

import { Log, LOG_DEFAULT_STATUS_CODE, LOG_NOT_APPLICABLE } from '../../models/log.model.js';

// mongoose reports 1 once it is connected
const MONGOOSE_CONNECTED_STATE = 1;

// pino counts levels, the database stores the words
const LEVEL_NAMES = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

// saves every log line into the logs collection
export const mongoLogStream = {
  write(line) {
    // nothing to save while the database is away
    if (mongoose.connection.readyState !== MONGOOSE_CONNECTED_STATE) {
      return;
    }

    const record = parseRecord(line);

    if (record === undefined) {
      return;
    }

    // not awaited, so logging never slows a reply down
    Log.create(toLogDocument(record)).catch((error) => {
      process.stderr.write(`log write failed: ${error.message}\n`);
    });
  },
};

// pino hands each line over as json text
function parseRecord(line) {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

// turns a pino line into a log document
function toLogDocument(record) {
  const method = record.method ?? record.req?.method ?? LOG_NOT_APPLICABLE;
  const endpoint = record.endpoint ?? record.req?.url ?? LOG_NOT_APPLICABLE;

  // the status arrives under a different name depending on who logged it
  const statusCode =
    record.statusCode ?? record.status ?? record.res?.statusCode ?? LOG_DEFAULT_STATUS_CODE;

  // the fields a log document keeps
  return {
    level: LEVEL_NAMES[record.level] ?? String(record.level),
    message: record.msg ?? '',
    method,
    endpoint,
    statusCode,
    timestamp: new Date(record.time),
  };
}
