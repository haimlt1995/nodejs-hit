import mongoose from 'mongoose';

import { isProduction } from '../config/env.js';
import { ApiError } from '../lib/ApiError.js';
import { logger } from '../lib/logger.js';

const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;
const HTTP_INTERNAL_SERVER_ERROR = 500;

// MongoDB reports a violated unique index using this driver code.
const DUPLICATE_KEY_CODE = 11000;

/**
 * Renders every failure as one consistent JSON document.
 *
 * Express recognises an error handler by its four parameters, so `next` has to
 * stay in the list even though this handler never passes control onwards.
 *
 * @param {Error} error - The error handed over to next().
 * @param {import('express').Request} req - The incoming request.
 * @param {import('express').Response} res - The outgoing response.
 * @param {import('express').NextFunction} next - Required for the arity above.
 * @returns {void}
 */
export function errorHandler(error, req, res, next) {
  const { status, message, details } = describeError(error);

  // pino-http attaches a per request logger, though a early failure may not have one.
  const requestLogger = req.log ?? logger;

  // A server fault is a defect worth a stack trace; a client fault is not.
  if (status >= HTTP_INTERNAL_SERVER_ERROR) {
    requestLogger.error({ err: error }, 'Unhandled request error');
  } else {
    requestLogger.warn({ status, message }, 'Request failed');
  }

  // Internal messages stay on the server once the code runs in production.
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
 * Maps a thrown error onto an HTTP status, a message, and optional details.
 *
 * Keeping the mapping in one pure function lets the middleware above stay focused
 * on logging and sending, and gathers every translation rule in a single place.
 *
 * @param {Error} error - The error handed over to next().
 * @returns {{status: number, message: string, details: Array<object>|undefined}} The described failure.
 */
function describeError(error) {
  // An expected failure, raised on purpose by a service.
  if (error instanceof ApiError) {
    return { status: error.status, message: error.message, details: error.details };
  }

  // A schema rule rejected the document, so name every offending field.
  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((fieldError) => ({
      field: fieldError.path,
      message: fieldError.message,
    }));

    return { status: HTTP_BAD_REQUEST, message: 'Validation failed', details };
  }

  // A property could not be converted to its schema type, a non numeric sum say.
  if (error instanceof mongoose.Error.CastError) {
    const message = `Invalid value for '${error.path}'`;

    return { status: HTTP_BAD_REQUEST, message, details: undefined };
  }

  // A unique index rejected the document.
  if (error.code === DUPLICATE_KEY_CODE) {
    return { status: HTTP_CONFLICT, message: 'Resource already exists', details: undefined };
  }

  // express.json() raises this when the body is not valid JSON.
  if (error.type === 'entity.parse.failed') {
    return { status: HTTP_BAD_REQUEST, message: 'Malformed JSON body', details: undefined };
  }

  // Anything left is an unexpected fault, reported as a server error.
  return {
    status: error.status ?? error.statusCode ?? HTTP_INTERNAL_SERVER_ERROR,
    message: error.message ?? 'Internal Server Error',
    details: undefined,
  };
}
