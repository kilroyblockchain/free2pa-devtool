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
import { getAuditConfiguration } from './services/auditor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function applySecurityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

export function rejectLegacyTestClient(_req, res) {
  return res.status(404).json({ error: 'Not found' });
}

export async function createServer() {
  await mkdir(config.uploadDir, { recursive: true });
  await mkdir(config.skillsDir, { recursive: true });

  const app = express();
  app.disable('x-powered-by');
  app.use(applySecurityHeaders);
  app.use(express.json({ limit: '2mb' }));
  app.get('/test.html', rejectLegacyTestClient);
  app.use(express.static(resolve(__dirname, '..', 'public')));
  app.use(['/api', '/mcp', '/health'], (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/status', (_req, res) => {
    const audit = getAuditConfiguration();
    res.json({
      success: true,
      version: config.appVersion,
      readOnly: config.readOnly,
      auditConfigured: audit.configured,
      auditProvider: audit.provider,
      auditModel: audit.model,
      trustStore: basename(config.certsDir),
    });
  });

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
