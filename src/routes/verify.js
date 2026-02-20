import { Router } from 'express';
import multer from 'multer';
import { readFile, unlink } from 'node:fs/promises';
import { config } from '../config.js';
import { verifySkill } from '../services/verifier.js';

const router = Router();
const upload = multer({ dest: config.uploadDir, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/verify
// Multipart fields:
//   file         (required) — the .md file
//   sidecar      (required) — the .c2pa.json sidecar
//   trustProfile (optional) — 'dev' | 'org' | 'public'  (default: 'dev')
router.post('/verify', upload.fields([
  { name: 'file',    maxCount: 1 },
  { name: 'sidecar', maxCount: 1 },
]), async (req, res) => {
  const assetFile   = req.files?.file?.[0];
  const sidecarFile = req.files?.sidecar?.[0];

  if (!assetFile)   return res.status(400).json({ success: false, error: 'No file uploaded (field: file).' });
  if (!sidecarFile) return res.status(400).json({ success: false, error: 'No sidecar uploaded (field: sidecar).' });

  const trustProfile = req.body.trustProfile || 'dev';

  try {
    const [content, sidecarText] = await Promise.all([
      readFile(assetFile.path,   'utf-8'),
      readFile(sidecarFile.path, 'utf-8'),
    ]);

    const result = await verifySkill({ content, sidecarText, trustProfile });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await unlink(assetFile.path).catch(() => {});
    await unlink(sidecarFile.path).catch(() => {});
  }
});

export default router;
