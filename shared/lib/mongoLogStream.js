import process from 'node:process';

import mongoose from 'mongoose';

import { Log, LOG_DEFAULT_STATUS_CODE, LOG_NOT_APPLICABLE } from '../../models/log.model.js';

// Mongoose reports 1 once the handshake is done.
const MONGOOSE_CONNECTED_STATE = 1;

// Pino's numeric levels, mapped to the words the collection stores.
const LEVEL_NAMES = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

/*
 * Pino destination that saves every record to the logs collection.
 *
 * Pino hands each record over as one line of JSON. Writes are fire and forget,
 * so logging never delays a response, and a failure is reported straight to
 * stderr rather than through the logger, which would loop back here.
 */
export const mongoLogStream = {
  write(line) {
    // Nothing can be stored before the connection is up.
    if (mongoose.connection.readyState !== MONGOOSE_CONNECTED_STATE) {
      return;
    }

    const record = parseRecord(line);

    // A line that will not parse is not worth crashing over.
    if (record === undefined) {
      return;
    }

    Log.create(toLogDocument(record)).catch((error) => {
      process.stderr.write(`log write failed: ${error.message}\n`);
    });
  },
};

/**
 * Parses one line of pino output.
 * @param {string} line - The JSON line pino wrote.
 * @returns {object|undefined} The record, or undefined when it will not parse.
 */
function parseRecord(line) {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

/**
 * Turns a pino record into a document shaped like the logs collection.
 *
 * Fields passed explicitly by the caller win. Otherwise they come from whatever
 * pino-http attached to the record for that request.
 *
 * @param {object} record - One parsed pino record.
 * @returns {object} The document to store.
 */
function toLogDocument(record) {
  const method = record.method ?? record.req?.method ?? LOG_NOT_APPLICABLE;
  const endpoint = record.endpoint ?? record.req?.url ?? LOG_NOT_APPLICABLE;

  // errorHandler reports the code as `status`, pino-http as `res.statusCode`.
  const statusCode =
    record.statusCode ?? record.status ?? record.res?.statusCode ?? LOG_DEFAULT_STATUS_CODE;

  // Exactly the field set the logs collection already uses.
  return {
    level: LEVEL_NAMES[record.level] ?? String(record.level),
    message: record.msg ?? '',
    method,
    endpoint,
    statusCode,
    timestamp: new Date(record.time),
  };
}
