import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { env } from '../config/env';
import { isAllowedMimeType } from '../utils/file.utils';

const storage = multer.memoryStorage();

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  if (isAllowedMimeType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only PDF files are allowed.`));
  }
}

const maxFileSizeBytes = env.maxFileSizeMb * 1024 * 1024;

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxFileSizeBytes },
}).single('file');

export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxFileSizeBytes },
}).array('files', 20);
