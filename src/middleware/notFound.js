import { ApiError } from '../lib/ApiError.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}
