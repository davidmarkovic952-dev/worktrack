import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import type { Db } from './db.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { recordRoutes } from './routes/records.js';
import { userRoutes } from './routes/users.js';
import { reportRoutes } from './routes/reports.js';

export function createApp(db: Db) {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes(db));
  app.use('/api/records', requireAuth, recordRoutes(db));
  app.use('/api/users', requireAuth, requireAdmin, userRoutes(db));
  app.use('/api/reports', requireAuth, reportRoutes(db));

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Napaka na strežniku' });
  };
  app.use(onError);
  return app;
}
