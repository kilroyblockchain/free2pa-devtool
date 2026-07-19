import { Router } from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runHelloWorldAgent, runUnprotectedHelloWorldAgent } from '../helloAgent.js';
import { consumeAuditAllowance } from '../services/auditLimit.js';

const router = Router();
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const demoRoot = resolve(root, 'public', 'demo', 'hello-agent');
const trustStore = resolve(demoRoot, 'trusted-publishers');
const scenarios = new Set(['trusted', 'changed', 'outside']);
const policies = new Set(['block', 'alert', 'log', 'repair']);

function publicResult(result) {
  const verification = result.gate?.verification ?? {};
  return {
    action: result.action,
    reasonCode: result.reasonCode,
    agent: result.agent,
    checks: result.gate ? {
      signatureValid: verification.signatureValid === true,
      fileUnchanged: verification.hashMatch === true,
      certificateCurrent: verification.certificate?.valid === true,
      publisherTrusted: verification.trust?.trusted === true,
    } : null,
  };
}

router.post('/hello-agent/run', async (req, res) => {
  const scenario = req.body?.scenario ?? 'trusted';
  const policy = req.body?.policy ?? 'block';
  if (!scenarios.has(scenario) || !policies.has(policy)) {
    return res.status(400).json({ success: false, error: 'Invalid scenario or policy.' });
  }
  if (!consumeAuditAllowance(req.ip)) {
    return res.status(429).json({ success: false, error: 'Hourly model limit reached for this client.' });
  }

  const assetPath = resolve(demoRoot, scenario, 'SOUL.md');
  try {
    const result = await runHelloWorldAgent({ assetPath, trustStore, policy });
    return res.json({ success: true, ...publicResult(result) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/hello-agent/compare', async (req, res) => {
  const scenario = req.body?.scenario ?? 'changed';
  const policy = req.body?.policy ?? 'block';
  if (!scenarios.has(scenario) || !policies.has(policy)) {
    return res.status(400).json({ success: false, error: 'Invalid scenario or policy.' });
  }
  if (!consumeAuditAllowance(req.ip)) {
    return res.status(429).json({ success: false, error: 'Hourly model limit reached for this client.' });
  }

  const assetPath = resolve(demoRoot, scenario, 'SOUL.md');
  try {
    const unprotected = await runUnprotectedHelloWorldAgent({ assetPath });
    const protectedResult = await runHelloWorldAgent({ assetPath, trustStore, policy });
    return res.json({
      success: true,
      input: 'hello',
      unprotected: publicResult(unprotected),
      protected: publicResult(protectedResult),
    });
  } catch (error) {
    const status = error.code === 'MODEL_NOT_CONFIGURED' ? 503 : 502;
    return res.status(status).json({ success: false, error: error.message });
  }
});

export default router;
