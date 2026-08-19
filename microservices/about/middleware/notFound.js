import { ApiError } from '../lib/ApiError.js';

// nothing matched the address, so answer 404
export function notFound(req, res, next) {
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}
