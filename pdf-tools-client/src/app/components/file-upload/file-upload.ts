import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.html',
})
export class FileUploadComponent {
  multiple = input(false);

  filesChanged = output<File[]>();

  files = signal<File[]>([]);
  isDragOver = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  removeFile(index: number, event: MouseEvent): void {
    event.stopPropagation();
    this.files.update((prev) => prev.filter((_, i) => i !== index));
    this.filesChanged.emit(this.files());
  }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private addFiles(newFiles: File[]): void {
    const pdfs = newFiles.filter((f) => f.type === 'application/pdf');
    if (pdfs.length === 0) return;
    if (this.multiple()) {
      this.files.update((prev) => [...prev, ...pdfs]);
    } else {
      this.files.set([pdfs[0]!]);
    }
    this.filesChanged.emit(this.files());
  }
}
