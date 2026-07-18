import { Router } from 'express';
import multer from 'multer';
import { readFile, unlink } from 'node:fs/promises';
import { config } from '../config.js';
import { auditSkill, DEFAULT_AUDIT_MODEL } from '../services/auditor.js';

const router = Router();
const upload = multer({ dest: config.uploadDir, limits: { fileSize: 256 * 1024 } });
const auditUsage = new Map();
const HOUR_MS = 60 * 60 * 1000;

function consumeAuditAllowance(clientId, now = Date.now()) {
  const current = auditUsage.get(clientId);
  if (!current || now - current.startedAt >= HOUR_MS) {
    auditUsage.set(clientId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= config.auditRequestsPerHour) return false;
  current.count += 1;
  return true;
}

router.post('/audit', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No skill uploaded (field: file).' });
  }
  if (!consumeAuditAllowance(req.ip)) {
    await unlink(req.file.path).catch(() => {});
    return res.status(429).json({ success: false, error: 'Hourly GPT audit limit reached for this client.' });
  }

  try {
    const content = await readFile(req.file.path, 'utf8');
    const report = await auditSkill({
      content,
      filename: req.file.originalname,
      model: req.body.model || process.env.OPENAI_MODEL || DEFAULT_AUDIT_MODEL,
    });
    res.json({ success: true, report });
  } catch (error) {
    const status = error.message.includes('OPENAI_API_KEY') ? 503 : 502;
    res.status(status).json({ success: false, error: error.message });
  } finally {
    await unlink(req.file.path).catch(() => {});
  }
});

export default router;
