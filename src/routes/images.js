import { Router }                 from 'express';
import multer                     from 'multer';
import { readFile, unlink }       from 'node:fs/promises';
import { extname }                from 'node:path';
import { config }                 from '../config.js';
import { verifyHardBound }        from '../services/hardBoundVerifier.js';

const router = Router();
const upload = multer({ dest: config.uploadDir, limits: { fileSize: 100 * 1024 * 1024 } });

const EXT_TO_MIME = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.tiff': 'image/tiff',
  '.tif':  'image/tiff',
  '.gif':  'image/gif',
  '.bmp':  'image/bmp',
  '.avif': 'image/avif',
};

function mimeFromFile(f) {
  const fromExt  = EXT_TO_MIME[extname(f.originalname).toLowerCase()];
  const fromMime = f.mimetype?.startsWith('image/') ? f.mimetype : null;
  return fromExt || fromMime || null;
}

// POST /api/images/verify — verify an uploaded image for embedded C2PA manifest.
//   No sidecar required. Returns hard-bound verification result.
router.post('/images/verify', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded (field: file).' });
  }

  const mimeType = mimeFromFile(req.file);
  if (!mimeType) {
    await unlink(req.file.path).catch(() => {});
    return res.status(400).json({
      success: false,
      error: `Unsupported type. Accepted: ${Object.keys(EXT_TO_MIME).join(', ')}`,
    });
  }

  let imageBuffer;
  try {
    imageBuffer = await readFile(req.file.path);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    await unlink(req.file.path).catch(() => {});
  }

  const checkC2pa = req.body.checkC2pa === '1';
  const result    = await verifyHardBound({ imageBuffer, mimeType, checkC2pa });

  if (!result.hasEmbeddedManifest) {
    return res.status(400).json({
      success: false,
      error: 'No embedded C2PA manifest found in this image. This endpoint verifies hard-bound (embedded) C2PA manifests only.',
    });
  }

  res.json({ ...result, binding: result.binding ?? 'hard' });
});

export default router;
