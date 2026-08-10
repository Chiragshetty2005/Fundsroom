import type { ErrorRequestHandler, RequestHandler } from 'express';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} was not found.`,
    },
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError ? error.message : 'An unexpected error occurred.';

  if (statusCode === 500) {
    console.error(error);
  }

  res.status(statusCode).json({ error: { message } });
};
