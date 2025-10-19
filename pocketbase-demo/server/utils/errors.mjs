/**
 * Custom error types to standardise API error responses.
 */

export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends HttpError {
  constructor(message, issues = []) {
    super(422, message, { issues });
    this.name = 'ValidationError';
  }
}
