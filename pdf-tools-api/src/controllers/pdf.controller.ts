import { Request, Response, NextFunction } from 'express';
import * as pdfService from '../services/pdf.service';
import { createError } from '../middleware/error.middleware';

function sendPdfResponse(res: Response, buffer: Buffer, filename: string): void {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': buffer.length,
  });
  res.send(buffer);
}

export async function merge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length < 2) {
      throw createError('At least 2 PDF files are required.', 400);
    }

    const buffers = files.map((f) => f.buffer);
    const result = await pdfService.mergePdfs(buffers);
    sendPdfResponse(res, result, 'merged.pdf');
  } catch (err) {
    next(err);
  }
}

export async function split(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) throw createError('No PDF file uploaded.', 400);

    const rawPages = req.body['pages'];
    if (!rawPages) throw createError('pages field is required (e.g. "1,3,5").', 400);

    const pages = String(rawPages)
      .split(',')
      .map((p) => parseInt(p.trim(), 10))
      .filter((p) => !isNaN(p));

    if (pages.length === 0) throw createError('No valid page numbers provided.', 400);

    const result = await pdfService.splitPdf(file.buffer, { pages });
    sendPdfResponse(res, result, 'split.pdf');
  } catch (err) {
    next(err);
  }
}

export async function rotate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) throw createError('No PDF file uploaded.', 400);

    const angle = parseInt(req.body['angle'], 10);
    if (![90, 180, 270].includes(angle)) {
      throw createError('angle must be 90, 180, or 270.', 400);
    }

    const rawPages = req.body['pages'];
    const pages =
      rawPages
        ? String(rawPages)
            .split(',')
            .map((p) => parseInt(p.trim(), 10))
            .filter((p) => !isNaN(p))
        : undefined;

    const result = await pdfService.rotatePdf(file.buffer, {
      angle: angle as pdfService.RotationAngle,
      pages,
    });
    sendPdfResponse(res, result, 'rotated.pdf');
  } catch (err) {
    next(err);
  }
}

export async function compress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) throw createError('No PDF file uploaded.', 400);

    const quality = req.body['quality'] ?? 'medium';
    if (!['low', 'medium', 'high'].includes(quality)) {
      throw createError('quality must be low, medium, or high.', 400);
    }

    const result = await pdfService.compressPdf(file.buffer, quality as pdfService.CompressQuality);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="compressed.pdf"',
      'Content-Length': result.data.length,
      'X-Original-Size': String(result.info.originalSize),
      'X-Compressed-Size': String(result.info.compressedSize),
    });
    res.send(result.data);
  } catch (err) {
    next(err);
  }
}

export async function sign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) throw createError('No PDF file uploaded.', 400);

    const text = String(req.body['text'] ?? '').trim();
    if (!text) throw createError('Signature text is required.', 400);

    const position = req.body['position'] ?? 'bottom-right';
    if (!['bottom-left', 'bottom-center', 'bottom-right'].includes(position)) {
      throw createError('position must be bottom-left, bottom-center, or bottom-right.', 400);
    }

    const pagesMode = req.body['pagesMode'] ?? 'all';
    if (!['all', 'first', 'last', 'custom'].includes(pagesMode)) {
      throw createError('pagesMode must be all, first, last, or custom.', 400);
    }

    const rawPages = req.body['pages'];
    const customPages =
      pagesMode === 'custom' && rawPages
        ? String(rawPages)
            .split(',')
            .map((p) => parseInt(p.trim(), 10))
            .filter((p) => !isNaN(p))
        : [];

    const result = await pdfService.signPdf(file.buffer, {
      text,
      position: position as pdfService.SignPosition,
      pagesMode: pagesMode as pdfService.SignPagesMode,
      customPages,
    });

    sendPdfResponse(res, result, 'signed.pdf');
  } catch (err) {
    next(err);
  }
}

export async function info(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) throw createError('No PDF file uploaded.', 400);

    const metadata = await pdfService.getPdfInfo(file.buffer);
    res.json({ data: metadata });
  } catch (err) {
    next(err);
  }
}
