import { Router } from 'express';
import multer from 'multer';
import { readFile, unlink } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { config } from '../config.js';
import { signSkill } from '../services/signer.js';

const router = Router();
const upload = multer({ dest: config.uploadDir, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/sign
// Multipart fields:
//   file        (required)  — the .md file to sign
//   title       (optional)  — dc:title
//   actor       (optional)  — student name / handle
//   course      (optional)
//   assignment  (optional)
//   repo        (optional)
//   studentId   (optional)
//   instructor  (optional)
//
// Response: application/json — the sidecar, downloaded as <filename>.c2pa.json
router.post('/sign', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded (field: file).' });
  }

  const { title, actor, course, assignment, repo, studentId, instructor, certId } = req.body;
  const origName    = req.file.originalname;
  const sidecarName = basename(origName, extname(origName)) + extname(origName) + '.c2pa.json';

  // Validate certId to prevent path traversal
  if (certId && !/^[a-z0-9-]+$/.test(certId)) {
    return res.status(400).json({ success: false, error: 'Invalid certId.' });
  }

  const certPath = certId ? resolve(config.certsDir, `${certId}.crt`) : undefined;
  const keyPath  = certId ? resolve(config.certsDir, `${certId}.key`) : undefined;

  try {
    const content = await readFile(req.file.path, 'utf-8');
    const sidecar = await signSkill({ content, title, actor, course, assignment, repo, studentId, instructor, certPath, keyPath });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${sidecarName}"`);
    res.json(sidecar);
  } catch (err) {
    // Surface cert-not-found errors helpfully
    const msg = err.code === 'ENOENT'
      ? 'Signing cert/key not found. Run: npm run generate-cert'
      : err.message;
    res.status(500).json({ success: false, error: msg });
  } finally {
    await unlink(req.file.path).catch(() => {});
  }
});

export default router;
