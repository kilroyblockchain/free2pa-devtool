import { Router } from 'express';
import multer from 'multer';
import { readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from '../config.js';
import { verifySkill } from '../services/verifier.js';

const router = Router();
const upload = multer({ dest: config.uploadDir, limits: { fileSize: 10 * 1024 * 1024 } });

export function loadDecision(result) {
  if (result.success !== true) return { decision: 'REJECT', reasonCode: 'INVALID_RECEIPT' };
  if (result.signatureValid !== true) return { decision: 'REJECT', reasonCode: 'INVALID_SIGNATURE' };
  if (result.hashMatch !== true) return { decision: 'REJECT', reasonCode: 'CONTENT_CHANGED' };
  if (result.certificate?.valid !== true) return { decision: 'REJECT', reasonCode: 'CERTIFICATE_NOT_CURRENT' };
  if (result.trust?.trusted !== true) {
    return { decision: 'REJECT', reasonCode: result.trust?.reason || 'UNTRUSTED_ISSUER' };
  }
  return { decision: 'LOAD', reasonCode: 'VERIFIED' };
}

export async function cleanupUploads(files) {
  const uploaded = Object.values(files ?? {}).flat();
  await Promise.all(uploaded.map((file) => unlink(file.path).catch(() => {})));
}

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

  if (!assetFile || !sidecarFile) {
    await cleanupUploads(req.files);
    const error = !assetFile
      ? 'No file uploaded (field: file).'
      : 'No sidecar uploaded (field: sidecar).';
    return res.status(400).json({ success: false, error });
  }

  const trustProfile = req.body.trustProfile || 'dev';
  const { certId }   = req.body;

  // Validate certId to prevent path traversal
  if (certId && !/^[a-z0-9-]+$/.test(certId)) {
    await cleanupUploads(req.files);
    return res.status(400).json({ success: false, error: 'Invalid certId.' });
  }

  const certPath = certId ? resolve(config.certsDir, `${certId}.crt`) : undefined;

  try {
    const [content, sidecarText] = await Promise.all([
      readFile(assetFile.path,   'utf-8'),
      readFile(sidecarFile.path, 'utf-8'),
    ]);

    const result = await verifySkill({ content, sidecarText, trustProfile, certPath });
    res.json({ ...result, ...loadDecision(result) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await cleanupUploads(req.files);
  }
});

export default router;
