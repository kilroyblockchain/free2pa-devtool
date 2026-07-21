import { Router } from 'express';
import multer from 'multer';
import { readFile, unlink } from 'node:fs/promises';
import { config } from '../config.js';
import { auditSkill, DEFAULT_AUDIT_MODEL } from '../services/auditor.js';
import { consumeAuditAllowance } from '../services/auditLimit.js';

const router = Router();
const upload = multer({ dest: config.uploadDir, limits: { fileSize: 64 * 1024 } });

router.post('/audit', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No skill uploaded (field: file).' });
  }
  if (!consumeAuditAllowance(req.ip)) {
    await unlink(req.file.path).catch(() => {});
    return res.status(429).json({ success: false, error: 'Hourly LLM audit limit reached for this client.' });
  }

  try {
    const content = await readFile(req.file.path, 'utf8');
    const report = await auditSkill({
      content,
      filename: req.file.originalname,
      model: config.readOnly
        ? process.env.FREE2PA_AUDITOR_MODEL || process.env.AZURE_OPENAI_DEPLOYMENT ||
          process.env.OPENAI_MODEL || DEFAULT_AUDIT_MODEL
        : req.body.model || process.env.FREE2PA_AUDITOR_MODEL ||
          process.env.AZURE_OPENAI_DEPLOYMENT || process.env.OPENAI_MODEL || DEFAULT_AUDIT_MODEL,
    });
    res.json({ success: true, report });
  } catch (error) {
    const status = error.code === 'AUDIT_NOT_CONFIGURED' ? 503 : 502;
    res.status(status).json({ success: false, error: error.message });
  } finally {
    await unlink(req.file.path).catch(() => {});
  }
});

export default router;
