import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileUploadComponent } from '../../components/file-upload/file-upload';
import { PdfApiService } from '../../services/pdf-api.service';

type Quality = 'low' | 'medium' | 'high';

interface QualityOption {
  value: Quality;
  label: string;
  description: string;
}

interface CompressResult {
  originalSize: number;
  compressedSize: number;
}

@Component({
  selector: 'app-compress-pdf',
  imports: [FileUploadComponent, RouterLink],
  templateUrl: './compress-pdf.html',
})
export class CompressPdfComponent {
  private pdfApi = inject(PdfApiService);

  file = signal<File | null>(null);
  quality = signal<Quality>('medium');
  isLoading = signal(false);
  error = signal<string | null>(null);
  result = signal<CompressResult | null>(null);

  savings = computed(() => {
    const r = this.result();
    if (!r) return null;
    const saved = r.originalSize - r.compressedSize;
    const pct = Math.round((saved / r.originalSize) * 100);
    return { saved, pct };
  });

  readonly qualityOptions: QualityOption[] = [
    { value: 'low', label: 'Maximum', description: '72 dpi · smallest file' },
    { value: 'medium', label: 'Balanced', description: '150 dpi · recommended' },
    { value: 'high', label: 'High quality', description: '300 dpi · less reduction' },
  ];

  onFileChanged(files: File[]): void {
    this.file.set(files[0] ?? null);
    this.error.set(null);
    this.result.set(null);
  }

  setQuality(value: Quality): void {
    this.quality.set(value);
  }

  compress(): void {
    const file = this.file();
    if (!file || this.isLoading()) return;
    this.isLoading.set(true);
    this.error.set(null);

    this.pdfApi.compress(file, this.quality()).subscribe({
      next: (response) => {
        const blob = response.body!;
        const originalSize = Number(response.headers.get('X-Original-Size') ?? file.size);
        const compressedSize = Number(response.headers.get('X-Compressed-Size') ?? blob.size);

        this.result.set({ originalSize, compressedSize });
        this.downloadBlob(blob, 'compressed.pdf');
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Compression failed. Please try again or use a different file.');
        this.isLoading.set(false);
      },
    });
  }

  reset(): void {
    this.file.set(null);
    this.quality.set('medium');
    this.result.set(null);
    this.error.set(null);
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
