import { PDFDocument, degrees, StandardFonts, rgb } from 'pdf-lib';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { createError } from '../middleware/error.middleware';
import { isPdfBuffer } from '../utils/file.utils';

const execFileAsync = promisify(execFile);

async function findGhostscript(): Promise<string | null> {
  // Check PATH first
  const pathCandidates =
    process.platform === 'win32' ? ['gswin64c', 'gswin32c', 'gs'] : ['gs'];
  for (const cmd of pathCandidates) {
    try {
      await execFileAsync(cmd, ['--version'], { timeout: 5000 });
      return cmd;
    } catch {
      continue;
    }
  }

  // On Windows, also probe common installation directories
  if (process.platform === 'win32') {
    const homedir = process.env['USERPROFILE'] ?? 'C:\\Users\\Default';
    const programFiles = process.env['ProgramFiles'] ?? 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';

    const baseDirs = [
      join(homedir, 'gs'),
      join(programFiles, 'gs'),
      join(programFilesX86, 'gs'),
    ];

    for (const base of baseDirs) {
      try {
        const { readdir } = await import('fs/promises');
        const entries = await readdir(base);
        // Ghostscript installs into a versioned sub-folder, e.g. gs10.05.1
        const versionDirs = entries.filter((e) => e.startsWith('gs'));
        const searchDirs = versionDirs.length > 0 ? versionDirs.map((d) => join(base, d)) : [base];
        for (const dir of searchDirs) {
          const exe = join(dir, 'bin', 'gswin64c.exe');
          try {
            await execFileAsync(exe, ['--version'], { timeout: 5000 });
            return exe;
          } catch {
            continue;
          }
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

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

export interface CompressResult {
  originalSize: number;
  compressedSize: number;
  method: 'ghostscript' | 'pdf-lib';
}

export type CompressQuality = 'low' | 'medium' | 'high';

// Per-quality image resolution settings
const GS_QUALITY_ARGS: Record<CompressQuality, string[]> = {
  low: [
    '-dPDFSETTINGS=/screen',
    '-dColorImageResolution=72',
    '-dGrayImageResolution=72',
    '-dMonoImageResolution=150',
  ],
  medium: [
    '-dPDFSETTINGS=/ebook',
    '-dColorImageResolution=150',
    '-dGrayImageResolution=150',
    '-dMonoImageResolution=300',
  ],
  high: [
    '-dPDFSETTINGS=/printer',
    '-dColorImageResolution=300',
    '-dGrayImageResolution=300',
    '-dMonoImageResolution=600',
  ],
};

const GS_COMMON_ARGS = [
  '-sDEVICE=pdfwrite',
  '-dCompatibilityLevel=1.4',
  '-dNOPAUSE',
  '-dQUIET',
  '-dBATCH',
  '-dCompressPages=true',
  '-dSubsetFonts=true',
  '-dEmbedAllFonts=true',
  '-dDownsampleColorImages=true',
  '-dDownsampleGrayImages=true',
  '-dDownsampleMonoImages=true',
  '-dColorImageDownsampleThreshold=1.0',
  '-dGrayImageDownsampleThreshold=1.0',
  '-dMonoImageDownsampleThreshold=1.0',
  '-dPassThroughJPEGImages=false',
  '-dPassThroughJPXImages=false',
];

/**
 * Fallback compression using pdf-lib only (no Ghostscript required).
 * Re-saves the PDF with object streams and Flate-compressed content streams.
 * Does not downsample images — best suited for text-heavy documents.
 */
async function compressPdfWithPdfLib(
  buffer: Buffer,
): Promise<{ data: Buffer; info: CompressResult }> {
  const doc = await PDFDocument.load(buffer, { updateMetadata: false });
  const bytes = await doc.save({ useObjectStreams: true });
  const compressed = Buffer.from(bytes);
  const best = compressed.length < buffer.length ? compressed : buffer;
  return {
    data: best,
    info: {
      originalSize: buffer.length,
      compressedSize: best.length,
      method: 'pdf-lib',
    },
  };
}

/**
 * Compresses a PDF. Uses Ghostscript when available (best compression, including
 * image downsampling). Falls back to a pure pdf-lib re-save when Ghostscript is
 * not installed (e.g. Vercel serverless). The fallback compresses structure and
 * content streams but does not re-encode embedded images.
 */
export async function compressPdf(
  buffer: Buffer,
  quality: CompressQuality = 'medium',
): Promise<{ data: Buffer; info: CompressResult }> {
  validatePdfBuffer(buffer);

  const gs = await findGhostscript();

  if (!gs) {
    return compressPdfWithPdfLib(buffer);
  }

  const id = randomUUID();
  const inputPath = join(tmpdir(), `pdf-in-${id}.pdf`);
  const outputPath = join(tmpdir(), `pdf-out-${id}.pdf`);

  try {
    await writeFile(inputPath, buffer);

    await execFileAsync(
      gs,
      [...GS_COMMON_ARGS, ...GS_QUALITY_ARGS[quality], `-sOutputFile=${outputPath}`, inputPath],
      { timeout: 120_000 },
    );

    const compressed = await readFile(outputPath);
    const best = compressed.length < buffer.length ? compressed : buffer;
    return {
      data: best,
      info: {
        originalSize: buffer.length,
        compressedSize: best.length,
        method: 'ghostscript',
      },
    };
  } finally {
    await Promise.all([unlink(inputPath).catch(() => {}), unlink(outputPath).catch(() => {})]);
  }
}

export type SignPagesMode = 'all' | 'first' | 'last' | 'custom';

export interface SignOptions {
  /** Horizontal position of the signature's left edge, as a fraction of page width (0–1). */
  xFraction: number;
  /** Vertical position of the signature's top edge, as a fraction of page height (0–1, from top). */
  yFraction: number;
  /** Signature width as a fraction of page width (0–1). */
  widthFraction: number;
  pagesMode: SignPagesMode;
  customPages?: number[]; // 1-based, only used when pagesMode === 'custom'
  text?: string;          // typed text signature
  imageData?: string;     // base64 PNG data URL from canvas drawing
}

/**
 * Adds a visual signature (drawn image or typed text) to specified pages of a PDF.
 * Position is specified as fractions of the page dimensions (CSS top-left origin).
 */
export async function signPdf(buffer: Buffer, options: SignOptions): Promise<Buffer> {
  validatePdfBuffer(buffer);

  if (!options.imageData && !options.text?.trim()) {
    throw createError('Either a drawn signature or signature text is required.', 400);
  }

  const doc = await PDFDocument.load(buffer);
  const totalPages = doc.getPageCount();

  let pageIndices: number[];
  switch (options.pagesMode) {
    case 'first':
      pageIndices = [0];
      break;
    case 'last':
      pageIndices = [totalPages - 1];
      break;
    case 'custom':
      pageIndices = (options.customPages ?? []).map((p) => {
        if (p < 1 || p > totalPages) {
          throw createError(`Page ${p} is out of range. Document has ${totalPages} pages.`, 400);
        }
        return p - 1;
      });
      break;
    default: // 'all'
      pageIndices = Array.from({ length: totalPages }, (_, i) => i);
  }

  if (pageIndices.length === 0) {
    throw createError('No valid pages to sign.', 400);
  }

  if (options.imageData) {
    // Drawn signature: embed as PNG image
    const base64 = options.imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const pngBuffer = Buffer.from(base64, 'base64');
    const pngImage = await doc.embedPng(pngBuffer);

    for (const idx of pageIndices) {
      const page = doc.getPage(idx);
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const sigWidth = options.widthFraction * pageWidth;
      const sigHeight = sigWidth * (pngImage.height / pngImage.width);

      // Convert from CSS top-left origin to PDF bottom-left origin
      const pdfX = options.xFraction * pageWidth;
      const pdfY = pageHeight - options.yFraction * pageHeight - sigHeight;

      page.drawImage(pngImage, { x: pdfX, y: pdfY, width: sigWidth, height: sigHeight });
    }
  } else {
    // Typed text signature
    const font = await doc.embedFont(StandardFonts.HelveticaOblique);
    const fontSize = 22;
    const inkColor = rgb(0.0, 0.1, 0.55);
    const lineColor = rgb(0.4, 0.4, 0.4);
    const text = options.text!;

    for (const idx of pageIndices) {
      const page = doc.getPage(idx);
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);

      // Scale text to fit the requested width fraction
      const requestedWidth = options.widthFraction * pageWidth;
      const scale = Math.min(1, requestedWidth / Math.max(textWidth, 1));
      const scaledFontSize = fontSize * scale;
      const scaledTextWidth = font.widthOfTextAtSize(text, scaledFontSize);

      const pdfX = options.xFraction * pageWidth;
      const pdfY = pageHeight - options.yFraction * pageHeight - scaledFontSize;

      page.drawLine({
        start: { x: pdfX - 2, y: pdfY + scaledFontSize + 4 },
        end: { x: pdfX + scaledTextWidth + 2, y: pdfY + scaledFontSize + 4 },
        thickness: 0.75,
        color: lineColor,
      });
      page.drawText(text, { x: pdfX, y: pdfY, size: scaledFontSize, font, color: inkColor });
    }
  }

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
