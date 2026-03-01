import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileUploadComponent } from '../../components/file-upload/file-upload';
import { PdfApiService } from '../../services/pdf-api.service';

type RotationAngle = 90 | 180 | 270;

interface AngleOption {
  value: RotationAngle;
  label: string;
}

@Component({
  selector: 'app-rotate-pdf',
  imports: [FileUploadComponent, RouterLink],
  templateUrl: './rotate-pdf.html',
})
export class RotatePdfComponent {
  private pdfApi = inject(PdfApiService);

  file = signal<File | null>(null);
  angle = signal<RotationAngle>(90);
  pages = signal('');
  isLoading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  readonly angleOptions: AngleOption[] = [
    { value: 90, label: '90° →' },
    { value: 180, label: '180° ↔' },
    { value: 270, label: '270° ←' },
  ];

  onFileChanged(files: File[]): void {
    this.file.set(files[0] ?? null);
    this.error.set(null);
    this.success.set(false);
  }

  onPagesInput(event: Event): void {
    this.pages.set((event.target as HTMLInputElement).value);
  }

  setAngle(value: RotationAngle): void {
    this.angle.set(value);
  }

  rotate(): void {
    const file = this.file();
    if (!file || this.isLoading()) return;
    this.isLoading.set(true);
    this.error.set(null);

    const pages = this.pages().trim() || undefined;
    this.pdfApi.rotate(file, this.angle(), pages).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'rotated.pdf');
        this.isLoading.set(false);
        this.success.set(true);
      },
      error: () => {
        this.error.set('Failed to rotate PDF. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  reset(): void {
    this.file.set(null);
    this.pages.set('');
    this.angle.set(90);
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
