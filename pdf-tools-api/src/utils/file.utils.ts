import { ALLOWED_MIME_TYPES, PDF_MAGIC_BYTES } from '../config/constants';

/**
 * Validates that a buffer is a real PDF by checking the magic bytes (%PDF-).
 */
export function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return PDF_MAGIC_BYTES.every((byte, i) => buffer[i] === byte);
}

/**
 * Validates uploaded file mime type against the allowed list.
 */
export function isAllowedMimeType(mimetype: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimetype);
}

/**
 * Converts bytes to megabytes.
 */
export function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024);
}
