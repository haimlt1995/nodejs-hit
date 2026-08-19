import mongoose from 'mongoose';

import { isProduction } from '../config/env.js';
import { ApiError } from '../lib/ApiError.js';
import { logger } from '../lib/logger.js';

const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;
const HTTP_INTERNAL_SERVER_ERROR = 500;

// mongo reports a duplicate with this code
const DUPLICATE_KEY_CODE = 11000;

// turns any failure into one json answer
export function errorHandler(error, req, res, next) {
  const { status, message, details } = describeError(error);

  const requestLogger = req.log ?? logger;

  // our own bug is worth a stack trace, a bad request is not
  if (status >= HTTP_INTERNAL_SERVER_ERROR) {
    requestLogger.error({ err: error }, 'Unhandled request error');
  } else {
    requestLogger.warn({ status, message }, 'Request failed');
  }

  // do not leak our internals to a real client
  const isMessageSafe = status < HTTP_INTERNAL_SERVER_ERROR || !isProduction;

  res.status(status).json({
    id: status,
    message: isMessageSafe ? message : 'Internal Server Error',
    ...(details === undefined ? {} : { details }),
  });
}

// works out the status and message for a thrown error
function describeError(error) {
  // thrown on purpose by our own code
  if (error instanceof ApiError) {
    return { status: error.status, message: error.message, details: error.details };
  }

  // a field broke a schema rule, so name every one of them
  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((fieldError) => ({
      field: fieldError.path,
      message: fieldError.message,
    }));

    return { status: HTTP_BAD_REQUEST, message: 'Validation failed', details };
  }

  // a value could not be converted, like a sum that is not a number
  if (error instanceof mongoose.Error.CastError) {
    const message = `Invalid value for '${error.path}'`;

    return { status: HTTP_BAD_REQUEST, message, details: undefined };
  }

  // something unique already exists
  if (error.code === DUPLICATE_KEY_CODE) {
    return { status: HTTP_CONFLICT, message: 'Resource already exists', details: undefined };
  }

  // the body was not valid json
  if (error.type === 'entity.parse.failed') {
    return { status: HTTP_BAD_REQUEST, message: 'Malformed JSON body', details: undefined };
  }

  // anything else is a bug on our side
  return {
    status: error.status ?? error.statusCode ?? HTTP_INTERNAL_SERVER_ERROR,
    message: error.message ?? 'Internal Server Error',
    details: undefined,
  };
}
