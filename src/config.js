import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

export const config = {
  port:      parseInt(process.env.PORT ?? '4001', 10),
  certPath:  resolve(root, process.env.CERT_PATH  ?? 'certs/signing.crt'),
  keyPath:   resolve(root, process.env.KEY_PATH   ?? 'certs/signing.key'),
  certsDir:  resolve(root, process.env.FREE2PA_CERTS_DIR ?? process.env.CERTS_DIR ?? 'certs'),
  uploadDir: resolve(root, process.env.UPLOAD_DIR ?? 'uploads'),
  skillsDir: resolve(root, process.env.SKILLS_DIR ?? 'radio_intern'),
  readOnly:  process.env.FREE2PA_READ_ONLY === 'true',
  auditRequestsPerHour: Math.max(Number.parseInt(process.env.FREE2PA_AUDIT_LIMIT ?? '20', 10), 1),
  auditGlobalRequestsPerHour: Math.max(Number.parseInt(process.env.FREE2PA_AUDIT_GLOBAL_LIMIT ?? '60', 10), 1),

  claimGenerator: 'Free2PA v0.4.0',
  appName:        'Free2PA',
  appVersion:     '0.4.0',
};
