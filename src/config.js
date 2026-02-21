import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

export const config = {
  port:      parseInt(process.env.PORT ?? '4001', 10),
  certPath:  resolve(root, process.env.CERT_PATH  ?? 'certs/signing.crt'),
  keyPath:   resolve(root, process.env.KEY_PATH   ?? 'certs/signing.key'),
  certsDir:  resolve(root, process.env.CERTS_DIR  ?? 'certs'),
  uploadDir: resolve(root, process.env.UPLOAD_DIR ?? 'uploads'),
  skillsDir: resolve(root, process.env.SKILLS_DIR ?? 'radio_intern'),

  claimGenerator: 'Friends of Justin / Free2PA v0.1.0',
  appName:        'Free2PA Skill Creds',
  appVersion:     '0.1.0',
};
