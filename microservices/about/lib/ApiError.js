// an error that already knows which http status to send
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);

    // nicer than plain 'Error' in a stack trace
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  // the request itself was wrong
  static badRequest(message = 'Bad Request', details) {
    return new ApiError(400, message, details);
  }

  // nothing found under that address
  static notFound(message = 'Not Found') {
    return new ApiError(404, message);
  }

  // it is already there
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }
}
