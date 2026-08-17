/**
 * Represents a failure that carries an HTTP status code.
 *
 * Services throw an ApiError to report an expected failure without importing
 * anything from Express. The error middleware reads the status and renders the
 * JSON body. Anything thrown that is not an ApiError is reported as a 500.
 */
export class ApiError extends Error {
  /**
   * @constructor
   * @param {number} status - HTTP status code to send back.
   * @param {string} message - Readable description of the failure.
   * @param {Array<object>} [details] - Optional per field explanations.
   */
  constructor(status, message, details) {
    super(message);

    // Keeps the class name in stack traces instead of the inherited 'Error'.
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  /**
   * Builds an error for a request the server could not accept.
   * @param {string} [message] - Readable description of the failure.
   * @param {Array<object>} [details] - Optional per field explanations.
   * @returns {ApiError} The error to throw.
   */
  static badRequest(message = 'Bad Request', details) {
    return new ApiError(400, message, details);
  }

  /**
   * Builds an error for a resource that does not exist.
   * @param {string} [message] - Readable description of the failure.
   * @returns {ApiError} The error to throw.
   */
  static notFound(message = 'Not Found') {
    return new ApiError(404, message);
  }

  /**
   * Builds an error for a resource that already exists.
   * @param {string} [message] - Readable description of the failure.
   * @returns {ApiError} The error to throw.
   */
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }
}
