/**
 * Centralized operational error type used across controllers.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(msg = 'Bad request', details = null) {
    return new ApiError(400, msg, details);
  }

  static unauthorized(msg = 'Not authorized, no token provided') {
    return new ApiError(401, msg);
  }

  static forbidden(msg = 'Access denied: insufficient role') {
    return new ApiError(403, msg);
  }

  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg);
  }

  static conflict(msg = 'Resource already exists') {
    return new ApiError(409, msg);
  }

  static external(msg = 'Upstream service failure') {
    return new ApiError(502, msg);
  }
}

module.exports = ApiError;
