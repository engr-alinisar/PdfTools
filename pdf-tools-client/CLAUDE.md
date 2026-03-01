# CLAUDE.md — pdf-tools-client

## Project Overview

Angular 21 frontend client for PDF Tools. Uses the modern standalone component API (no NgModules), Angular Signals for reactivity, Tailwind CSS v4 for styling, and Vitest for unit testing.

---

## Tech Stack

| Layer            | Technology                          |
|------------------|-------------------------------------|
| Framework        | Angular 21 (standalone API)         |
| Language         | TypeScript 5.9 (strict mode)        |
| Styling          | Tailwind CSS v4 + component CSS     |
| HTTP Client      | Angular HttpClient                  |
| State            | Angular Signals + RxJS Observables  |
| Testing          | Vitest + Angular TestBed            |
| Build            | @angular/build (ESBuild-based)      |
| Package Manager  | npm                                 |
| Code Formatter   | Prettier                            |

---

## Common Commands

```bash
# Start dev server (http://localhost:4200)
npm start

# Production build
npm run build

# Watch mode (dev build)
npm run watch

# Run unit tests
npm test
```

---

## Project Structure

```
src/
├── app/
│   ├── app.ts           # Root standalone component
│   ├── app.html         # Root template
│   ├── app.css          # Root component styles
│   ├── app.config.ts    # App-level providers (DI config)
│   ├── app.routes.ts    # Route definitions
│   └── app.spec.ts      # Root component tests
├── main.ts              # Bootstrap entry point
├── styles.css           # Global styles (imports Tailwind)
└── index.html           # Shell HTML
```

### Conventions for New Files

- Components: `src/app/components/<name>/<name>.ts`
- Services: `src/app/services/<name>.service.ts`
- Models/Interfaces: `src/app/models/<name>.model.ts`
- Guards: `src/app/guards/<name>.guard.ts`
- Interceptors: `src/app/interceptors/<name>.interceptor.ts`
- Pipes: `src/app/pipes/<name>.pipe.ts`

---

## Angular Patterns

### Standalone Components (always use this pattern)

```typescript
import { Component, signal, inject } from '@angular/core';

@Component({
  selector: 'app-example',
  imports: [/* only what this component needs */],
  templateUrl: './example.html',
  styleUrl: './example.css'
})
export class ExampleComponent {
  private service = inject(ExampleService);
  protected readonly data = signal<string[]>([]);
}
```

### Services

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ExampleService {
  private http = inject(HttpClient);
}
```

### Adding Providers

Add new providers in [src/app/app.config.ts](src/app/app.config.ts):

```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),  // add here
  ]
};
```

### Adding Routes

Define routes in [src/app/app.routes.ts](src/app/app.routes.ts):

```typescript
export const routes: Routes = [
  {
    path: 'pdf-viewer',
    loadComponent: () =>
      import('./components/pdf-viewer/pdf-viewer').then(m => m.PdfViewerComponent)
  }
];
```

---

## Styling

- **Global styles:** [src/styles.css](src/styles.css) — imports Tailwind via `@import 'tailwindcss'`
- **Component styles:** Scoped via `styleUrl` in the `@Component` decorator
- **Tailwind CSS v4** — use utility classes directly in templates
- **No SCSS** — plain CSS only
- Prettier formats HTML templates using the Angular parser

---

## TypeScript

- **Strict mode** is fully enabled — no implicit any, no implicit returns, strict templates
- Target: ES2022
- Use `override` keyword when overriding base class methods
- Prefer `inject()` function over constructor injection

---

## Testing

- Test files live alongside source files: `*.spec.ts`
- Use Angular `TestBed` for component tests
- Run with `npm test`

```typescript
import { TestBed } from '@angular/core/testing';
import { ExampleComponent } from './example';

describe('ExampleComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExampleComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ExampleComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
```

---

## Code Style

Prettier is configured in [.prettierrc](.prettierrc):
- Print width: **100 characters**
- Quotes: **single quotes** for TS/JS
- HTML: Angular parser
- Indentation: **2 spaces** (via `.editorconfig`)

---

## Key Files

| File | Purpose |
|------|---------|
| [src/main.ts](src/main.ts) | Bootstrap entry point |
| [src/app/app.ts](src/app/app.ts) | Root component |
| [src/app/app.config.ts](src/app/app.config.ts) | DI providers / app config |
| [src/app/app.routes.ts](src/app/app.routes.ts) | Route definitions |
| [src/styles.css](src/styles.css) | Global Tailwind import |
| [angular.json](angular.json) | Angular CLI project config |
| [tsconfig.json](tsconfig.json) | TypeScript base config |
| [.postcssrc.json](.postcssrc.json) | PostCSS / Tailwind config |
| [.prettierrc](.prettierrc) | Prettier formatting config |
