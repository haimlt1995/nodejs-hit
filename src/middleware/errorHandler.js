import mongoose from 'mongoose';

import { isProduction } from '../config/env.js';
import { ApiError } from '../lib/ApiError.js';
import { logger } from '../lib/logger.js';

/**
 * Terminal error middleware. Express identifies it by its four-argument signature,
 * so `next` must stay in the list even though it is unused.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const { status, message, details } = normalize(err);
  const log = req.log ?? logger;

  if (status >= 500) {
    log.error({ err }, 'Unhandled request error');
  } else {
    log.warn({ status, message }, 'Request failed');
  }

  res.status(status).json({
    error: {
      status,
      // Never leak internals of a 500 to clients in production.
      message: status >= 500 && isProduction ? 'Internal Server Error' : message,
      ...(details ? { details } : {}),
    },
  });
}

function normalize(err) {
  if (err instanceof ApiError) {
    return { status: err.status, message: err.message, details: err.details };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return {
      status: 400,
      message: 'Validation failed',
      details: Object.values(err.errors).map(({ path, message }) => ({ field: path, message })),
    };
  }

  if (err instanceof mongoose.Error.CastError) {
    return { status: 400, message: `Invalid value for '${err.path}'` };
  }

  // Duplicate key on a unique index.
  if (err?.code === 11000) {
    return { status: 409, message: 'Resource already exists' };
  }

  // Thrown by express.json() on a malformed body.
  if (err?.type === 'entity.parse.failed') {
    return { status: 400, message: 'Malformed JSON body' };
  }

  return {
    status: err?.status ?? err?.statusCode ?? 500,
    message: err?.message ?? 'Internal Server Error',
  };
}
