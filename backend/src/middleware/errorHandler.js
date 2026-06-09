/**
 * Centralized error handler middleware.
 * Returns structured JSON error response.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Create structured response format
  const response = {
    status: 'error',
    message: err.message || 'Internal Server Error',
  };

  // Include stack trace in development only
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  // Log error to console/logging service
  console.error(`[Error Boundary] ${req.method} ${req.originalUrl} - ${statusCode}: ${err.message}`);
  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
