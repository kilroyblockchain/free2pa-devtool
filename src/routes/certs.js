import { Router }                              from 'express';
import { readdir, writeFile, unlink, access } from 'node:fs/promises';
import { resolve, basename }                  from 'node:path';
import { execFile }                           from 'node:child_process';
import { promisify }                          from 'node:util';
import { config }                             from '../config.js';

const execFileP = promisify(execFile);
const router    = Router();

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

export default router;
