import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileUploadComponent } from '../../components/file-upload/file-upload';
import { PdfApiService } from '../../services/pdf-api.service';

@Component({
  selector: 'app-split-pdf',
  imports: [FileUploadComponent, RouterLink],
  templateUrl: './split-pdf.html',
})
export class SplitPdfComponent {
  private pdfApi = inject(PdfApiService);

  file = signal<File | null>(null);
  pages = signal('');
  isLoading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  canSplit = computed(() => !!this.file() && this.pages().trim().length > 0);

  onFileChanged(files: File[]): void {
    this.file.set(files[0] ?? null);
    this.error.set(null);
    this.success.set(false);
  }

  onPagesInput(event: Event): void {
    this.pages.set((event.target as HTMLInputElement).value);
  }

  split(): void {
    const file = this.file();
    if (!file || !this.canSplit() || this.isLoading()) return;
    this.isLoading.set(true);
    this.error.set(null);

    this.pdfApi.split(file, this.pages()).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'split.pdf');
        this.isLoading.set(false);
        this.success.set(true);
      },
      error: () => {
        this.error.set('Failed to split PDF. Check that the page numbers are valid.');
        this.isLoading.set(false);
      },
    });
  }

  reset(): void {
    this.file.set(null);
    this.pages.set('');
    this.success.set(false);
    this.error.set(null);
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
