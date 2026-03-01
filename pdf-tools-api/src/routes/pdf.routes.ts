import { Router } from 'express';
import { uploadSingle, uploadMultiple } from '../middleware/upload.middleware';
import * as pdfController from '../controllers/pdf.controller';

export const pdfRoutes = Router();

// POST /api/pdf/merge  — body: multipart files[] (2–20 PDFs)
pdfRoutes.post('/merge', uploadMultiple, pdfController.merge);

// POST /api/pdf/split  — body: multipart file + pages (e.g. "1,3,5")
pdfRoutes.post('/split', uploadSingle, pdfController.split);

// POST /api/pdf/rotate — body: multipart file + angle (90|180|270) + optional pages
pdfRoutes.post('/rotate', uploadSingle, pdfController.rotate);

// POST /api/pdf/info   — body: multipart file → returns PDF metadata
pdfRoutes.post('/info', uploadSingle, pdfController.info);
