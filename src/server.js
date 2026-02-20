import express from 'express';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config } from './config.js';
import signRouter   from './routes/sign.js';
import verifyRouter from './routes/verify.js';
import certsRouter  from './routes/certs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function createServer() {
  await mkdir(config.uploadDir, { recursive: true });

  const app = express();
  app.use(express.json());
  app.use(express.static(resolve(__dirname, '..', 'public')));

  app.use('/api', signRouter);
  app.use('/api', verifyRouter);
  app.use('/api', certsRouter);

  app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'Free2PA', version: '0.1.0' }));
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}
