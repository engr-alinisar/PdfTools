import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileUploadComponent } from '../../components/file-upload/file-upload';
import { PdfApiService } from '../../services/pdf-api.service';

type SignPosition = 'bottom-left' | 'bottom-center' | 'bottom-right';
type PagesMode = 'all' | 'first' | 'last' | 'custom';

interface PositionOption {
  value: SignPosition;
  label: string;
  icon: string;
}

interface PagesModeOption {
  value: PagesMode;
  label: string;
}

@Component({
  selector: 'app-sign-pdf',
  imports: [FileUploadComponent, RouterLink],
  templateUrl: './sign-pdf.html',
})
export class SignPdfComponent {
  private pdfApi = inject(PdfApiService);

  file = signal<File | null>(null);
  signatureText = signal('');
  position = signal<SignPosition>('bottom-right');
  pagesMode = signal<PagesMode>('all');
  customPages = signal('');
  isLoading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  canSign = computed(
    () => !!this.file() && this.signatureText().trim().length > 0,
  );

  readonly positionOptions: PositionOption[] = [
    { value: 'bottom-left', label: 'Bottom Left', icon: '↙' },
    { value: 'bottom-center', label: 'Bottom Center', icon: '↓' },
    { value: 'bottom-right', label: 'Bottom Right', icon: '↘' },
  ];

  readonly pagesModeOptions: PagesModeOption[] = [
    { value: 'all', label: 'All pages' },
    { value: 'first', label: 'First page' },
    { value: 'last', label: 'Last page' },
    { value: 'custom', label: 'Custom pages' },
  ];

  onFileChanged(files: File[]): void {
    this.file.set(files[0] ?? null);
    this.error.set(null);
    this.success.set(false);
  }

  onSignatureInput(event: Event): void {
    this.signatureText.set((event.target as HTMLInputElement).value);
  }

  onCustomPagesInput(event: Event): void {
    this.customPages.set((event.target as HTMLInputElement).value);
  }

  setPosition(value: SignPosition): void {
    this.position.set(value);
  }

  setPagesMode(value: PagesMode): void {
    this.pagesMode.set(value);
  }

  sign(): void {
    const file = this.file();
    if (!file || !this.canSign() || this.isLoading()) return;
    this.isLoading.set(true);
    this.error.set(null);

    const pages = this.pagesMode() === 'custom' ? this.customPages().trim() || undefined : undefined;

    this.pdfApi.sign(file, this.signatureText().trim(), this.position(), this.pagesMode(), pages).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'signed.pdf');
        this.isLoading.set(false);
        this.success.set(true);
      },
      error: () => {
        this.error.set('Failed to sign PDF. Please check your inputs and try again.');
        this.isLoading.set(false);
      },
    });
  }

  reset(): void {
    this.file.set(null);
    this.signatureText.set('');
    this.position.set('bottom-right');
    this.pagesMode.set('all');
    this.customPages.set('');
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
