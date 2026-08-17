import { ApiError } from '../lib/ApiError.js';

/**
 * Turns an unmatched route into a 404.
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @param {import('express').NextFunction} next - Passes control on.
 * @returns {void}
 */
export function notFound(req, res, next) {
  // Passing an error to next() jumps to the error middleware.
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}
