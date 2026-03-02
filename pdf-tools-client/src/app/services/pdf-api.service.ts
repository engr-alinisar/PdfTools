import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PdfInfo } from '../models/pdf-info.model';
import { environment } from '../../environments/environment';

export interface CompressResponse {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
}

const API_URL = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class PdfApiService {
  private http = inject(HttpClient);

  merge(files: File[]): Observable<Blob> {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return this.http.post(API_URL + '/merge', form, { responseType: 'blob' });
  }

  split(file: File, pages: string): Observable<Blob> {
    const form = new FormData();
    form.append('file', file);
    form.append('pages', pages);
    return this.http.post(API_URL + '/split', form, { responseType: 'blob' });
  }

  rotate(file: File, angle: number, pages?: string): Observable<Blob> {
    const form = new FormData();
    form.append('file', file);
    form.append('angle', angle.toString());
    if (pages) form.append('pages', pages);
    return this.http.post(API_URL + '/rotate', form, { responseType: 'blob' });
  }

  compress(file: File, quality: 'low' | 'medium' | 'high'): Observable<HttpResponse<Blob>> {
    const form = new FormData();
    form.append('file', file);
    form.append('quality', quality);
    return this.http.post(API_URL + '/compress', form, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  sign(
    file: File,
    xFraction: number,
    yFraction: number,
    widthFraction: number,
    pagesMode: string,
    text?: string,
    imageData?: string,
    pages?: string,
  ): Observable<Blob> {
    const form = new FormData();
    form.append('file', file);
    form.append('xFraction', xFraction.toString());
    form.append('yFraction', yFraction.toString());
    form.append('widthFraction', widthFraction.toString());
    form.append('pagesMode', pagesMode);
    if (text) form.append('text', text);
    if (imageData) form.append('imageData', imageData);
    if (pages) form.append('pages', pages);
    return this.http.post(API_URL + '/sign', form, { responseType: 'blob' });
  }

  info(file: File): Observable<{ data: PdfInfo }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ data: PdfInfo }>(API_URL + '/info', form);
  }
}
