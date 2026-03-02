import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { pdfRoutes } from './routes/pdf.routes';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

// Security
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    exposedHeaders: ['X-Original-Size', 'X-Compressed-Size'],
  }),
);

// Rate limiting
app.use(
  rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMaxRequests,
    message: { error: 'Too many requests, please try again later.' },
  }),
);

// Body parsing
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/pdf', pdfRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorMiddleware);

app.listen(env.port, () => {
  console.log(`pdf-tools-api running on http://localhost:${env.port}`);
  console.log(`Environment: ${env.nodeEnv}`);
});

export default app;
