import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PdfInfo } from '../models/pdf-info.model';

const API_URL = 'http://localhost:3000/api/pdf';

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

  info(file: File): Observable<{ data: PdfInfo }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ data: PdfInfo }>(API_URL + '/info', form);
  }
}
