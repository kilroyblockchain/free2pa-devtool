import { Router } from 'express';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { runHelloWorldAgent, runUnprotectedHelloWorldAgent } from '../helloAgent.js';
import { consumeAuditAllowance } from '../services/auditLimit.js';
import { signSkill } from '../services/signer.js';

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
  const policy = req.body?.policy ?? 'repair';
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

router.post('/hello-agent/run-edited', async (req, res) => {
  const policy = req.body?.policy ?? 'repair';
  const content = req.body?.content;
  if (!policies.has(policy) || typeof content !== 'string' || content.length > 20_000) {
    return res.status(400).json({ success: false, error: 'Invalid edited control file or policy.' });
  }
  if (!consumeAuditAllowance(req.ip)) {
    return res.status(429).json({ success: false, error: 'Hourly model limit reached for this client.' });
  }

  const directory = await mkdtemp(resolve(tmpdir(), 'free2pa-hello-edit-'));
  const assetPath = resolve(directory, 'SOUL.md');
  const sidecarPath = resolve(demoRoot, 'trusted', 'SOUL.md.c2pa.json');
  try {
    await writeFile(assetPath, content, 'utf8');
    const result = await runHelloWorldAgent({ assetPath, sidecarPath, trustStore, policy });
    return res.json({ success: true, edited: true, ...publicResult(result) });
  } catch (error) {
    const status = error.code === 'MODEL_NOT_CONFIGURED' ? 503 : 502;
    return res.status(status).json({ success: false, error: error.message });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

router.post('/hello-agent/sign-edited', async (req, res) => {
  const content = req.body?.content;
  if (typeof content !== 'string' || content.length > 20_000) {
    return res.status(400).json({ success: false, error: 'Invalid edited control file.' });
  }
  if (config.readOnly) {
    return res.status(403).json({ success: false, error: 'Signing is disabled on this read-only verifier.' });
  }

  try {
    const sidecar = await signSkill({
      content,
      title: 'SOUL.md',
      actor: 'Local Free2PA verify console',
      purpose: 'Approve edited Hello World agent control file for this local demo session.',
    });
    return res.json({
      success: true,
      signed: true,
      sidecar,
      publisher: sidecar.signature.cert_pem,
    });
  } catch (error) {
    const status = error.code === 'ENOENT' ? 503 : 502;
    return res.status(status).json({ success: false, error: error.message });
  }
});

router.post('/hello-agent/run-signed-edited', async (req, res) => {
  const policy = req.body?.policy ?? 'block';
  const content = req.body?.content;
  const sidecar = req.body?.sidecar;
  const sidecarText = typeof sidecar === 'string' ? sidecar : JSON.stringify(sidecar);
  if (!policies.has(policy) || typeof content !== 'string' || content.length > 20_000 || !sidecar) {
    return res.status(400).json({ success: false, error: 'Invalid signed control file, sidecar, or policy.' });
  }
  if (!consumeAuditAllowance(req.ip)) {
    return res.status(429).json({ success: false, error: 'Hourly model limit reached for this client.' });
  }

  const directory = await mkdtemp(resolve(tmpdir(), 'free2pa-hello-signed-edit-'));
  const assetPath = resolve(directory, 'SOUL.md');
  const sidecarPath = resolve(directory, 'SOUL.md.c2pa.json');
  try {
    await Promise.all([
      writeFile(assetPath, content, 'utf8'),
      writeFile(sidecarPath, sidecarText, 'utf8'),
    ]);
    const result = await runHelloWorldAgent({ assetPath, sidecarPath, trustCert: config.certPath, policy });
    return res.json({ success: true, edited: true, signed: true, ...publicResult(result) });
  } catch (error) {
    const status = error.code === 'MODEL_NOT_CONFIGURED' ? 503 : 502;
    return res.status(status).json({ success: false, error: error.message });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

router.post('/hello-agent/compare', async (req, res) => {
  const scenario = req.body?.scenario ?? 'changed';
  const policy = req.body?.policy ?? 'repair';
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
