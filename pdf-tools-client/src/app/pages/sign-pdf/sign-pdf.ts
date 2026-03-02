import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileUploadComponent } from '../../components/file-upload/file-upload';
import { PdfApiService } from '../../services/pdf-api.service';
import type { PDFDocumentProxy } from 'pdfjs-dist';

type PagesMode = 'all' | 'first' | 'last' | 'custom';
type SignMode = 'draw' | 'type';
type Stage = 'setup' | 'place' | 'success';

// Fixed CSS width of the draggable signature box on the PDF preview
const SIG_BOX_CSS_WIDTH = 180;

@Component({
  selector: 'app-sign-pdf',
  imports: [FileUploadComponent, RouterLink],
  templateUrl: './sign-pdf.html',
})
export class SignPdfComponent implements AfterViewInit {
  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pdfCanvas') pdfCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pdfContainer') pdfContainerRef!: ElementRef<HTMLDivElement>;

  private pdfApi = inject(PdfApiService);

  // ── Drawing state ──────────────────────────────────────────────────────────
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  // ── PDF viewer state ───────────────────────────────────────────────────────
  private pdfDoc: PDFDocumentProxy | null = null;
  private renderTask: { cancel: () => void } | null = null;
  renderedPageWidth = signal(0);
  renderedPageHeight = signal(0);
  currentPage = signal(1);
  pageCount = signal(0);
  isRenderingPdf = signal(false);

  // ── Signature placement (CSS px relative to rendered PDF canvas) ───────────
  sigX = signal(40);
  sigY = signal(40);
  readonly sigBoxWidth = SIG_BOX_CSS_WIDTH;
  sigBoxHeight = computed(() => (this.signMode() === 'type' ? 38 : Math.round(SIG_BOX_CSS_WIDTH * 0.35)));

  // ── Drag state ─────────────────────────────────────────────────────────────
  isDragging = false;
  private dragStartMouseX = 0;
  private dragStartMouseY = 0;
  private dragStartSigX = 0;
  private dragStartSigY = 0;

  // ── Form signals ───────────────────────────────────────────────────────────
  stage = signal<Stage>('setup');
  file = signal<File | null>(null);
  signMode = signal<SignMode>('draw');
  signatureText = signal('');
  strokeColor = signal('#1a1a1a');
  pagesMode = signal<PagesMode>('all');
  customPages = signal('');
  isLoading = signal(false);
  error = signal<string | null>(null);
  hasDrawing = signal(false);
  drawnSigDataUrl = signal<string | null>(null);

  canProceed = computed(() => {
    if (!this.file()) return false;
    return this.signMode() === 'draw' ? this.hasDrawing() : this.signatureText().trim().length > 0;
  });

  readonly colorOptions = [
    { value: '#1a1a1a', bg: 'bg-gray-900' },
    { value: '#cc0000', bg: 'bg-red-600' },
    { value: '#1a56cc', bg: 'bg-blue-600' },
    { value: '#157a1a', bg: 'bg-green-700' },
  ];

  readonly pagesModeOptions = [
    { value: 'all' as PagesMode, label: 'All pages' },
    { value: 'first' as PagesMode, label: 'First page' },
    { value: 'last' as PagesMode, label: 'Last page' },
    { value: 'custom' as PagesMode, label: 'Custom pages' },
  ];

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', () => this.onTouchEnd(), { passive: false });

    requestAnimationFrame(() => requestAnimationFrame(() => this.initCanvas()));
  }

  private initCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : (canvas.offsetWidth || 560);
    const h = rect.height > 0 ? rect.height : (canvas.offsetHeight || 160);

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;
    this.ctx.scale(dpr, dpr);
    this.applyCtxStyles();
  }

  private applyCtxStyles(): void {
    if (!this.ctx) return;
    this.ctx.strokeStyle = this.strokeColor();
    this.ctx.fillStyle = this.strokeColor();
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  // ── Canvas drawing ─────────────────────────────────────────────────────────

  setColor(color: string): void {
    this.strokeColor.set(color);
    if (this.ctx) {
      this.ctx.strokeStyle = color;
      this.ctx.fillStyle = color;
    }
  }

  clearCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    this.hasDrawing.set(false);
    this.drawnSigDataUrl.set(null);
  }

  setMode(mode: SignMode): void {
    this.signMode.set(mode);
  }

  onMouseDown(event: MouseEvent): void {
    if (!this.ctx) this.initCanvas();
    this.isDrawing = true;
    const pos = this.getMousePos(event);
    this.lastX = pos.x;
    this.lastY = pos.y;
    if (this.ctx) {
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.ctx.lineWidth / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.hasDrawing.set(true);
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDrawing || !this.ctx) return;
    const pos = this.getMousePos(event);
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  onMouseUp(): void {
    this.isDrawing = false;
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (!this.ctx) this.initCanvas();
    const touch = event.touches[0];
    if (!touch) return;
    this.isDrawing = true;
    const pos = this.getTouchPos(touch);
    this.lastX = pos.x;
    this.lastY = pos.y;
    this.hasDrawing.set(true);
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing || !this.ctx) return;
    const touch = event.touches[0];
    if (!touch) return;
    const pos = this.getTouchPos(touch);
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  private onTouchEnd(): void {
    this.isDrawing = false;
  }

  private getMousePos(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private getTouchPos(touch: Touch): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  // ── Form handlers ──────────────────────────────────────────────────────────

  onFileChanged(files: File[]): void {
    this.file.set(files[0] ?? null);
    this.error.set(null);
  }

  onSignatureInput(event: Event): void {
    this.signatureText.set((event.target as HTMLInputElement).value);
  }

  onCustomPagesInput(event: Event): void {
    this.customPages.set((event.target as HTMLInputElement).value);
  }

  setPagesMode(value: PagesMode): void {
    this.pagesMode.set(value);
  }

  // ── Stage navigation ───────────────────────────────────────────────────────

  async goToPlacement(): Promise<void> {
    if (!this.canProceed()) return;

    if (this.signMode() === 'draw' && this.hasDrawing()) {
      this.drawnSigDataUrl.set(this.canvasRef.nativeElement.toDataURL('image/png'));
    } else {
      this.drawnSigDataUrl.set(null);
    }

    this.stage.set('place');
    this.error.set(null);

    requestAnimationFrame(() => requestAnimationFrame(() => this.loadAndRenderPdf()));
  }

  backToSetup(): void {
    this.stage.set('setup');
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
  }

  // ── PDF rendering ──────────────────────────────────────────────────────────

  private async loadAndRenderPdf(): Promise<void> {
    const file = this.file();
    if (!file) return;

    this.isRenderingPdf.set(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      if (this.pdfDoc) this.pdfDoc.destroy();
      this.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      this.pageCount.set(this.pdfDoc.numPages);
      this.currentPage.set(1);

      await this.renderPage(1);

      // Default placement: center, 80% down the page
      const pw = this.renderedPageWidth();
      const ph = this.renderedPageHeight();
      this.sigX.set(Math.round((pw - SIG_BOX_CSS_WIDTH) / 2));
      this.sigY.set(Math.round(ph * 0.82));
    } catch {
      this.error.set('Failed to render PDF preview.');
      this.stage.set('setup');
    } finally {
      this.isRenderingPdf.set(false);
    }
  }

  private async renderPage(pageNum: number): Promise<void> {
    if (!this.pdfDoc) return;

    const canvas = this.pdfCanvasRef?.nativeElement;
    const container = this.pdfContainerRef?.nativeElement;
    if (!canvas || !container) return;

    this.renderTask?.cancel();

    const page = await this.pdfDoc.getPage(pageNum);
    const containerWidth = container.clientWidth || 600;

    const naturalViewport = page.getViewport({ scale: 1 });
    const scale = containerWidth / naturalViewport.width;
    const viewport = page.getViewport({ scale });

    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    this.renderedPageWidth.set(canvas.width);
    this.renderedPageHeight.set(canvas.height);

    const ctx = canvas.getContext('2d')!;
    const task = page.render({ canvasContext: ctx, canvas, viewport });
    this.renderTask = task;
    await task.promise;
  }

  async goToPage(delta: number): Promise<void> {
    const next = this.currentPage() + delta;
    if (next < 1 || next > this.pageCount()) return;
    this.currentPage.set(next);
    await this.renderPage(next);
  }

  // ── Signature dragging ─────────────────────────────────────────────────────

  onSigMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.dragStartMouseX = event.clientX;
    this.dragStartMouseY = event.clientY;
    this.dragStartSigX = this.sigX();
    this.dragStartSigY = this.sigY();
    event.preventDefault();
    event.stopPropagation();
  }

  @HostListener('document:mousemove', ['$event'])
  onDocMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = event.clientX - this.dragStartMouseX;
    const dy = event.clientY - this.dragStartMouseY;
    const maxX = this.renderedPageWidth() - this.sigBoxWidth;
    const maxY = this.renderedPageHeight() - this.sigBoxHeight();
    this.sigX.set(Math.max(0, Math.min(maxX, this.dragStartSigX + dx)));
    this.sigY.set(Math.max(0, Math.min(maxY, this.dragStartSigY + dy)));
  }

  @HostListener('document:mouseup')
  onDocMouseUp(): void {
    this.isDragging = false;
  }

  // ── Sign action ────────────────────────────────────────────────────────────

  sign(): void {
    const file = this.file();
    if (!file || this.isLoading()) return;
    this.isLoading.set(true);
    this.error.set(null);

    const pw = this.renderedPageWidth();
    const ph = this.renderedPageHeight();
    const xFraction = this.sigX() / pw;
    const yFraction = this.sigY() / ph;
    const widthFraction = this.sigBoxWidth / pw;

    const pages = this.pagesMode() === 'custom' ? this.customPages().trim() || undefined : undefined;
    const isDrawMode = this.signMode() === 'draw';
    const imageData = isDrawMode ? (this.drawnSigDataUrl() ?? undefined) : undefined;
    const text = !isDrawMode ? this.signatureText().trim() : undefined;

    this.pdfApi
      .sign(file, xFraction, yFraction, widthFraction, this.pagesMode(), text, imageData, pages)
      .subscribe({
        next: (blob) => {
          this.downloadBlob(blob, 'signed.pdf');
          this.isLoading.set(false);
          this.stage.set('success');
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
    this.pagesMode.set('all');
    this.customPages.set('');
    this.stage.set('setup');
    this.error.set(null);
    this.hasDrawing.set(false);
    this.drawnSigDataUrl.set(null);
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
    // Delay clearCanvas so canvasRef is re-attached after stage change
    requestAnimationFrame(() => this.clearCanvas());
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
