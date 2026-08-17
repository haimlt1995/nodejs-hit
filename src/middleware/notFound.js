import { ApiError } from '../lib/ApiError.js';

/**
 * Turns a request that matched no route into a 404 ApiError.
 * @param {import('express').Request} req - The incoming request.
 * @param {import('express').Response} res - The outgoing response.
 * @param {import('express').NextFunction} next - Passes control onwards.
 * @returns {void}
 */
export function notFound(req, res, next) {
  // Handing an error to next() skips straight ahead to the error middleware.
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}
