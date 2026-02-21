import { Router }                                    from 'express';
import multer                                        from 'multer';
import { readdir, readFile, writeFile, unlink, access } from 'node:fs/promises';
import { resolve, basename }                         from 'node:path';
import { execFile }                                  from 'node:child_process';
import { promisify }                                 from 'node:util';
import { config }                                    from '../config.js';

const execFileP = promisify(execFile);
const router    = Router();
const upload    = multer({ dest: config.uploadDir, limits: { fileSize: 1 * 1024 * 1024 } });

// ── helpers ───────────────────────────────────────────────────────────────────

async function certInfo(crtPath) {
  try {
    const { stdout } = await execFileP('openssl', [
      'x509', '-noout', '-subject', '-enddate', '-in', crtPath,
    ]);
    const subjMatch = stdout.match(/subject=(.+)/);
    const dateMatch = stdout.match(/notAfter=(.+)/);
    return {
      subject:  subjMatch ? subjMatch[1].trim() : '(unknown)',
      notAfter: dateMatch ? dateMatch[1].trim() : null,
    };
  } catch {
    return { subject: '(unreadable)', notAfter: null };
  }
}

// ── GET /api/certs ────────────────────────────────────────────────────────────
// Returns list of signing certs available in the certs/ directory.
router.get('/certs', async (_req, res) => {
  try {
    const files    = await readdir(config.certsDir);
    const crtFiles = files.filter(f => f.endsWith('.crt'));

    const certs = await Promise.all(crtFiles.map(async (file) => {
      const id      = basename(file, '.crt');
      const crtPath = resolve(config.certsDir, file);
      const keyPath = resolve(config.certsDir, id + '.key');

      let hasKey = false;
      try { await access(keyPath); hasKey = true; } catch {}

      const info = await certInfo(crtPath);
      return { id, hasKey, ...info };
    }));

    res.json({ success: true, certs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/certs/generate ──────────────────────────────────────────────────
// Body (JSON): { name, org, validityDays }
// Generates a new ECDSA P-256 self-signed cert saved as certs/{slug}.crt/key.
router.post('/certs/generate', async (req, res) => {
  const { name, org, validityDays } = req.body ?? {};

  if (!name?.trim()) {
    return res.status(400).json({ success: false, error: '"name" is required.' });
  }

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) {
    return res.status(400).json({ success: false, error: 'Name produces an empty ID.' });
  }

  const days     = Math.min(Math.max(parseInt(validityDays) || 365, 1), 3650);
  const orgName  = (org?.trim()) || 'Friends of Justin';
  const keyPath  = resolve(config.certsDir, `${slug}.key`);
  const crtPath  = resolve(config.certsDir, `${slug}.crt`);
  const tmpConf  = resolve(config.certsDir, `tmp_${slug}_${Date.now()}.conf`);

  const confContent = [
    '[req]',
    'distinguished_name = dn',
    'x509_extensions    = v3',
    'prompt             = no',
    '',
    '[dn]',
    `O  = ${orgName}`,
    `CN = ${name.trim()}`,
    '',
    '[v3]',
    'basicConstraints     = critical, CA:FALSE',
    'keyUsage             = critical, digitalSignature',
    'subjectKeyIdentifier = hash',
  ].join('\n');

  try {
    await writeFile(tmpConf, confContent);
    await execFileP('openssl', [
      'genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:P-256', '-out', keyPath,
    ]);
    await execFileP('openssl', [
      'req', '-new', '-x509',
      '-key', keyPath, '-out', crtPath,
      '-days', String(days), '-config', tmpConf,
    ]);

    const info = await certInfo(crtPath);
    res.json({ success: true, cert: { id: slug, hasKey: true, ...info } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await unlink(tmpConf).catch(() => {});
  }
});

// ── GET /api/certs/:id/download ───────────────────────────────────────────────
// Serves the named .crt file as a download.
router.get('/certs/:id/download', async (req, res) => {
  const { id } = req.params;
  if (!/^[a-z0-9-]+$/.test(id)) {
    return res.status(400).json({ success: false, error: 'Invalid cert ID.' });
  }
  const crtPath = resolve(config.certsDir, `${id}.crt`);
  try {
    await access(crtPath);
    res.setHeader('Content-Type', 'application/x-pem-file');
    res.setHeader('Content-Disposition', `attachment; filename="${id}.crt"`);
    res.sendFile(crtPath);
  } catch {
    res.status(404).json({ success: false, error: 'Certificate not found.' });
  }
});

// ── POST /api/certs/import ────────────────────────────────────────────────────
// Accepts one or more .crt files (field: files[]).
// Optional body field `name` overrides the save filename for single-file imports.
// Each file is validated as a real X.509 cert before being written to certs/.
router.post('/certs/import', upload.array('files', 50), async (req, res) => {
  const files = req.files ?? [];
  if (!files.length) {
    return res.status(400).json({ success: false, error: 'No files uploaded.' });
  }

  const customName = (req.body.name ?? '').trim()
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const results = [];
  for (const f of files) {
    const stem = basename(f.originalname, '.crt')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const name = (files.length === 1 && customName) ? customName : stem;

    if (!name) {
      results.push({ file: f.originalname, success: false, error: 'Cannot derive a valid name from filename.' });
      await unlink(f.path).catch(() => {});
      continue;
    }

    const destPath = resolve(config.certsDir, `${name}.crt`);
    try {
      await execFileP('openssl', ['x509', '-noout', '-in', f.path]);
      const info    = await certInfo(f.path);
      const content = await readFile(f.path);
      await writeFile(destPath, content);
      results.push({ file: f.originalname, success: true, id: name, ...info });
    } catch {
      results.push({ file: f.originalname, success: false, error: 'Not a valid X.509 certificate.' });
    } finally {
      await unlink(f.path).catch(() => {});
    }
  }

  const allOk = results.every(r => r.success);
  const anyOk = results.some(r => r.success);
  res.status(allOk ? 200 : anyOk ? 207 : 400).json({ success: anyOk, results });
});

export default router;
