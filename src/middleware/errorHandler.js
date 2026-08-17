import mongoose from 'mongoose';

import { isProduction } from '../config/env.js';
import { ApiError } from '../lib/ApiError.js';
import { logger } from '../lib/logger.js';

const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;
const HTTP_INTERNAL_SERVER_ERROR = 500;

// Mongo's code for a unique index violation.
const DUPLICATE_KEY_CODE = 11000;

/**
 * Renders every failure as the same JSON shape.
 *
 * Express spots an error handler by its four parameters, so `next` has to stay
 * even though it is never called.
 *
 * @param {Error} error - Whatever reached next().
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @param {import('express').NextFunction} next - Only here for the arity.
 * @returns {void}
 */
export function errorHandler(error, req, res, next) {
  const { status, message, details } = describeError(error);

  // pino-http adds req.log, but an early failure might not have one.
  const requestLogger = req.log ?? logger;

  // Our bug gets a stack trace, their bad input does not.
  if (status >= HTTP_INTERNAL_SERVER_ERROR) {
    requestLogger.error({ err: error }, 'Unhandled request error');
  } else {
    requestLogger.warn({ status, message }, 'Request failed');
  }

  // Keep internal messages off the wire in production.
  const isMessageSafe = status < HTTP_INTERNAL_SERVER_ERROR || !isProduction;

  res.status(status).json({
    error: {
      status,
      message: isMessageSafe ? message : 'Internal Server Error',
      ...(details === undefined ? {} : { details }),
    },
  });
}

/**
 * Maps a thrown error to a status, a message and optional details.
 *
 * Pure, and every rule sits together, so the middleware above only logs and sends.
 *
 * @param {Error} error - Whatever reached next().
 * @returns {{status: number, message: string, details: Array<object>|undefined}} The mapped failure.
 */
function describeError(error) {
  // Thrown on purpose by a service.
  if (error instanceof ApiError) {
    return { status: error.status, message: error.message, details: error.details };
  }

  // A schema rule failed, so list every bad field.
  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((fieldError) => ({
      field: fieldError.path,
      message: fieldError.message,
    }));

    return { status: HTTP_BAD_REQUEST, message: 'Validation failed', details };
  }

  // A value would not convert, a non numeric sum for instance.
  if (error instanceof mongoose.Error.CastError) {
    const message = `Invalid value for '${error.path}'`;

    return { status: HTTP_BAD_REQUEST, message, details: undefined };
  }

  // A unique index turned it away.
  if (error.code === DUPLICATE_KEY_CODE) {
    return { status: HTTP_CONFLICT, message: 'Resource already exists', details: undefined };
  }

  // express.json() raises this on a broken body.
  if (error.type === 'entity.parse.failed') {
    return { status: HTTP_BAD_REQUEST, message: 'Malformed JSON body', details: undefined };
  }

  // Anything left is a bug on our side.
  return {
    status: error.status ?? error.statusCode ?? HTTP_INTERNAL_SERVER_ERROR,
    message: error.message ?? 'Internal Server Error',
    details: undefined,
  };
}
