# CLAUDE.md — pdf-tools-api

## Project Overview

Node.js + Express REST API for PDF processing. Handles merge, split, rotate, and metadata extraction using `pdf-lib`. Files are processed entirely in memory — nothing is stored on disk.

---

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Runtime        | Node.js                           |
| Framework      | Express 4                         |
| Language       | TypeScript 5 (strict mode)        |
| PDF Processing | pdf-lib                           |
| File Uploads   | multer (memory storage)           |
| Security       | helmet, express-rate-limit, cors  |
| Dev Server     | tsx + nodemon                     |
| Formatter      | Prettier                          |

---

## Common Commands

```bash
# Install dependencies
npm install

# Start dev server with hot reload (http://localhost:3000)
npm run dev

# Production build
npm run build

# Run production build
npm start
```

---

## Project Structure

```
src/
├── index.ts                      # Express app bootstrap
├── config/
│   ├── env.ts                    # Typed env variables
│   └── constants.ts              # App-wide constants
├── routes/
│   └── pdf.routes.ts             # Route definitions
├── controllers/
│   └── pdf.controller.ts         # Request/response handling
├── services/
│   └── pdf.service.ts            # PDF business logic (pdf-lib)
├── middleware/
│   ├── upload.middleware.ts      # multer config
│   └── error.middleware.ts       # Global error handler
└── utils/
    └── file.utils.ts             # File validation helpers
```

---

## API Endpoints

Base URL: `http://localhost:3000/api/pdf`

| Method | Endpoint  | Body (multipart/form-data)              | Response     |
|--------|-----------|-----------------------------------------|--------------|
| GET    | /health   | —                                       | JSON status  |
| POST   | /merge    | `files[]` (2–20 PDFs)                  | PDF download |
| POST   | /split    | `file` + `pages` (e.g. `"1,3,5"`)     | PDF download |
| POST   | /rotate   | `file` + `angle` (90/180/270) + optional `pages` | PDF download |
| POST   | /info     | `file`                                  | JSON metadata |

---

## Environment Variables

Copy `.env.example` to `.env` before running:

```bash
cp .env.example .env
```

| Variable                | Default                   | Description                       |
|-------------------------|---------------------------|-----------------------------------|
| `PORT`                  | `3000`                    | Server port                       |
| `NODE_ENV`              | `development`             | Environment mode                  |
| `MAX_FILE_SIZE_MB`      | `50`                      | Max upload size in MB             |
| `RATE_LIMIT_WINDOW_MS`  | `900000`                  | Rate limit window (15 min)        |
| `RATE_LIMIT_MAX_REQUESTS`| `100`                    | Max requests per window           |
| `CORS_ORIGINS`          | `http://localhost:4200`   | Comma-separated allowed origins   |

---

## Adding a New PDF Tool

1. Add the logic in [src/services/pdf.service.ts](src/services/pdf.service.ts)
2. Add a controller method in [src/controllers/pdf.controller.ts](src/controllers/pdf.controller.ts)
3. Register the route in [src/routes/pdf.routes.ts](src/routes/pdf.routes.ts)
4. Use `uploadSingle` for one file or `uploadMultiple` for many

---

## Key Conventions

- **Memory only** — `multer.memoryStorage()`, no temp files written to disk
- **Validate early** — check magic bytes (`%PDF-`), not just MIME type
- **Always use `next(err)`** — never `throw` inside controllers, pass to error middleware
- **`createError(message, statusCode)`** — use this helper to create HTTP errors
- TypeScript strict mode is on — no implicit `any`, no unused variables
- Prettier: 100 char width, single quotes, trailing commas

---

## Key Files

| File | Purpose |
|------|---------|
| [src/index.ts](src/index.ts) | Express app setup and server start |
| [src/config/env.ts](src/config/env.ts) | Typed environment config |
| [src/config/constants.ts](src/config/constants.ts) | Constants (magic bytes, limits) |
| [src/routes/pdf.routes.ts](src/routes/pdf.routes.ts) | All route definitions |
| [src/controllers/pdf.controller.ts](src/controllers/pdf.controller.ts) | HTTP layer |
| [src/services/pdf.service.ts](src/services/pdf.service.ts) | PDF processing logic |
| [src/middleware/upload.middleware.ts](src/middleware/upload.middleware.ts) | Multer config |
| [src/middleware/error.middleware.ts](src/middleware/error.middleware.ts) | Global error handler |
| [.env.example](.env.example) | Environment variable template |
