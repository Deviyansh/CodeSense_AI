import { logger } from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";

  logger.error("request.failed", {
    requestId: req.id,
    code,
    status,
    message: err.message,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(status).json({
    success: false,
    error: {
      code,
      message: status >= 500 ? "An unexpected error occurred" : err.publicMessage || err.message || "Request could not be completed",
    },
    meta: { requestId: req.id },
  });
}
