import express from 'express';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, dirname, resolve } from 'node:path';
import { config } from './config.js';
import signRouter   from './routes/sign.js';
import verifyRouter from './routes/verify.js';
import certsRouter  from './routes/certs.js';
import skillsRouter from './routes/skills.js';
import mcpRouter    from './routes/mcp.js';
import auditRouter  from './routes/audit.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function createServer() {
  await mkdir(config.uploadDir, { recursive: true });
  await mkdir(config.skillsDir, { recursive: true });

  const app = express();
  app.use(express.json());
  app.use(express.static(resolve(__dirname, '..', 'public')));
  app.use(['/api', '/mcp', '/health'], (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/status', (_req, res) => res.json({
    success: true,
    version: config.appVersion,
    readOnly: config.readOnly,
    auditConfigured: Boolean(process.env.OPENAI_API_KEY),
    trustStore: basename(config.certsDir),
  }));

  app.use('/api', signRouter);
  app.use('/api', verifyRouter);
  app.use('/api', certsRouter);
  app.use('/api', skillsRouter);
  app.use('/api', auditRouter);
  app.use('/',    mcpRouter);

  app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'Free2PA', version: config.appVersion }));
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}
