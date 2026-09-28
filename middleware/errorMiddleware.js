const ApiError = require('../utils/ApiError');

/* 404 - unmatched route */
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

/* Centralized error handling - always answers with a standard envelope */
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Mongoose schema validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field "${err.path}"`;
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value - a record with this ${field} already exists`;
    details = err.keyValue;
  }

  if (statusCode >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 ? { stack: err.stack } : {}),
  });
};

module.exports = { notFound, errorHandler };
