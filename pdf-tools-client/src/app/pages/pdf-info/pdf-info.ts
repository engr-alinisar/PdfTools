import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileUploadComponent } from '../../components/file-upload/file-upload';
import { PdfApiService } from '../../services/pdf-api.service';
import { PdfInfo } from '../../models/pdf-info.model';

@Component({
  selector: 'app-pdf-info',
  imports: [FileUploadComponent, RouterLink],
  templateUrl: './pdf-info.html',
})
export class PdfInfoComponent {
  private pdfApi = inject(PdfApiService);

  file = signal<File | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  pdfInfo = signal<PdfInfo | null>(null);

  onFileChanged(files: File[]): void {
    this.file.set(files[0] ?? null);
    this.pdfInfo.set(null);
    this.error.set(null);
  }

  getInfo(): void {
    const file = this.file();
    if (!file || this.isLoading()) return;
    this.isLoading.set(true);
    this.error.set(null);

    this.pdfApi.info(file).subscribe({
      next: (res) => {
        this.pdfInfo.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to read PDF info. Please check your file.');
        this.isLoading.set(false);
      },
    });
  }

  reset(): void {
    this.file.set(null);
    this.pdfInfo.set(null);
    this.error.set(null);
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
  }
}
