/**
 * An error that carries an HTTP status.
 *
 * Services throw this to report an expected failure without importing Express.
 * Anything else that gets thrown becomes a 500.
 */
export class ApiError extends Error {
  /**
   * @constructor
   * @param {number} status - HTTP status to send.
   * @param {string} message - What went wrong.
   * @param {Array<object>} [details] - Optional per field notes.
   */
  constructor(status, message, details) {
    super(message);

    // Show 'ApiError' in stack traces instead of 'Error'.
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  /**
   * 400, the request was unusable.
   * @param {string} [message] - What went wrong.
   * @param {Array<object>} [details] - Optional per field notes.
   * @returns {ApiError} The error to throw.
   */
  static badRequest(message = 'Bad Request', details) {
    return new ApiError(400, message, details);
  }

  /**
   * 404, no such resource.
   * @param {string} [message] - What went wrong.
   * @returns {ApiError} The error to throw.
   */
  static notFound(message = 'Not Found') {
    return new ApiError(404, message);
  }

  /**
   * 409, the resource is already there.
   * @param {string} [message] - What went wrong.
   * @returns {ApiError} The error to throw.
   */
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }
}
