import { Router } from 'express';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from '../config.js';
import { verifySkill } from '../services/verifier.js';

const router = Router();

// Safe skill name: letters, digits, hyphens, underscores only — no path traversal possible
function isValidName(name) {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

// GET /api/skills — list skill folders in radio_intern
router.get('/skills', async (_req, res) => {
  try {
    const entries = await readdir(config.skillsDir, { withFileTypes: true });
    const skills = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const mdPath      = resolve(config.skillsDir, entry.name, 'SKILL.md');
      const sidecarPath = resolve(config.skillsDir, entry.name, 'SKILL.md.c2pa.json');

      try {
        await readFile(mdPath); // skill must have a SKILL.md
        let hasSidecar = false;
        try { await readFile(sidecarPath); hasSidecar = true; } catch {}
        skills.push({ name: entry.name, hasSidecar });
      } catch {}
    }

    res.json({ success: true, skills });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/skills/:name/verify — verify a named skill against its sidecar
router.post('/skills/:name/verify', async (req, res) => {
  const { name } = req.params;

  if (!isValidName(name)) {
    return res.status(400).json({ success: false, error: 'Invalid skill name.' });
  }

  const mdPath      = resolve(config.skillsDir, name, 'SKILL.md');
  const sidecarPath = resolve(config.skillsDir, name, 'SKILL.md.c2pa.json');

  try {
    const [content, sidecarText] = await Promise.all([
      readFile(mdPath,      'utf-8'),
      readFile(sidecarPath, 'utf-8'),
    ]);

    const result = await verifySkill({ content, sidecarText, trustProfile: 'dev' });
    res.json(result);
  } catch (err) {
    if (err.code === 'ENOENT') {
      const missing = String(err.path).endsWith('.c2pa.json') ? 'sidecar (.c2pa.json)' : 'SKILL.md';
      return res.status(404).json({ success: false, error: `Missing ${missing} for skill "${name}".` });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
