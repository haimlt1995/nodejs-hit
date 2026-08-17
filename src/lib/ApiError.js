/**
 * Error carrying an HTTP status, so services can fail without knowing about Express.
 * Anything thrown that is not an ApiError is treated as a 500 by the error handler.
 */
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message = 'Bad Request', details) {
    return new ApiError(400, message, details);
  }

  static notFound(message = 'Not Found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }
}
