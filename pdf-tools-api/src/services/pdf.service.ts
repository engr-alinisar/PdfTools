import { PDFDocument, degrees } from 'pdf-lib';
import { createError } from '../middleware/error.middleware';
import { isPdfBuffer } from '../utils/file.utils';

export type RotationAngle = 90 | 180 | 270;

export interface SplitOptions {
  pages: number[]; // 1-based page numbers to extract
}

export interface RotateOptions {
  angle: RotationAngle;
  pages?: number[]; // 1-based; if omitted, rotate all pages
}

function validatePdfBuffer(buffer: Buffer, label = 'file'): void {
  if (!isPdfBuffer(buffer)) {
    throw createError(`Invalid PDF ${label}. File does not appear to be a valid PDF.`, 400);
  }
}

/**
 * Merges multiple PDF buffers into a single PDF.
 */
export async function mergePdfs(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length < 2) {
    throw createError('At least 2 PDF files are required to merge.', 400);
  }

  const merged = await PDFDocument.create();

  for (let i = 0; i < buffers.length; i++) {
    validatePdfBuffer(buffers[i]!, `file ${i + 1}`);
    const doc = await PDFDocument.load(buffers[i]!);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }

  const bytes = await merged.save();
  return Buffer.from(bytes);
}

/**
 * Splits a PDF by extracting specific pages (1-based).
 */
export async function splitPdf(buffer: Buffer, options: SplitOptions): Promise<Buffer> {
  validatePdfBuffer(buffer);

  const source = await PDFDocument.load(buffer);
  const totalPages = source.getPageCount();

  const pageIndices = options.pages.map((p) => {
    if (p < 1 || p > totalPages) {
      throw createError(
        `Page number ${p} is out of range. Document has ${totalPages} pages.`,
        400,
      );
    }
    return p - 1; // convert to 0-based
  });

  const result = await PDFDocument.create();
  const copied = await result.copyPages(source, pageIndices);
  copied.forEach((page) => result.addPage(page));

  const bytes = await result.save();
  return Buffer.from(bytes);
}

/**
 * Rotates pages in a PDF.
 */
export async function rotatePdf(buffer: Buffer, options: RotateOptions): Promise<Buffer> {
  validatePdfBuffer(buffer);

  const doc = await PDFDocument.load(buffer);
  const totalPages = doc.getPageCount();

  const targetIndices =
    options.pages && options.pages.length > 0
      ? options.pages.map((p) => {
          if (p < 1 || p > totalPages) {
            throw createError(
              `Page number ${p} is out of range. Document has ${totalPages} pages.`,
              400,
            );
          }
          return p - 1;
        })
      : Array.from({ length: totalPages }, (_, i) => i);

  targetIndices.forEach((i) => {
    const page = doc.getPage(i);
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + options.angle) % 360));
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

/**
 * Returns basic metadata about a PDF.
 */
export async function getPdfInfo(buffer: Buffer): Promise<Record<string, unknown>> {
  validatePdfBuffer(buffer);

  const doc = await PDFDocument.load(buffer);
  return {
    pageCount: doc.getPageCount(),
    title: doc.getTitle() ?? null,
    author: doc.getAuthor() ?? null,
    subject: doc.getSubject() ?? null,
    creator: doc.getCreator() ?? null,
    creationDate: doc.getCreationDate() ?? null,
    modificationDate: doc.getModificationDate() ?? null,
  };
}
