import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileUploadComponent } from '../../components/file-upload/file-upload';
import { PdfApiService } from '../../services/pdf-api.service';

@Component({
  selector: 'app-merge-pdf',
  imports: [FileUploadComponent, RouterLink],
  templateUrl: './merge-pdf.html',
})
export class MergePdfComponent {
  private pdfApi = inject(PdfApiService);

  files = signal<File[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  onFilesChanged(files: File[]): void {
    this.files.set(files);
    this.error.set(null);
    this.success.set(false);
  }

  merge(): void {
    if (this.files().length < 2 || this.isLoading()) return;
    this.isLoading.set(true);
    this.error.set(null);

    this.pdfApi.merge(this.files()).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'merged.pdf');
        this.isLoading.set(false);
        this.success.set(true);
      },
      error: () => {
        this.error.set('Failed to merge PDFs. Please check your files and try again.');
        this.isLoading.set(false);
      },
    });
  }

  reset(): void {
    this.files.set([]);
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
