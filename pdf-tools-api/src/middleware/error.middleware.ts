import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { env } from '../config/env';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorMiddleware(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Multer errors (file upload issues)
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: `File too large. Maximum allowed size is ${env.maxFileSizeMb}MB.` });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const message =
    statusCode === 500 && env.nodeEnv === 'production'
      ? 'Internal server error'
      : err.message;

  if (statusCode === 500) {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({ error: message });
}

export function createError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  return err;
}
