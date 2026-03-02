import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'merge',
    loadComponent: () => import('./pages/merge-pdf/merge-pdf').then((m) => m.MergePdfComponent),
  },
  {
    path: 'split',
    loadComponent: () => import('./pages/split-pdf/split-pdf').then((m) => m.SplitPdfComponent),
  },
  {
    path: 'rotate',
    loadComponent: () =>
      import('./pages/rotate-pdf/rotate-pdf').then((m) => m.RotatePdfComponent),
  },
  {
    path: 'compress',
    loadComponent: () =>
      import('./pages/compress-pdf/compress-pdf').then((m) => m.CompressPdfComponent),
  },
  {
    path: 'sign',
    loadComponent: () => import('./pages/sign-pdf/sign-pdf').then((m) => m.SignPdfComponent),
  },
  {
    path: 'info',
    loadComponent: () => import('./pages/pdf-info/pdf-info').then((m) => m.PdfInfoComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
