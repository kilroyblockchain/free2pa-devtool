import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { verifySkill } from './services/verifier.js';

const SIDECAR_SUFFIX = '.c2pa.json';

function decisionFor(result) {
  if (!result.success) return { decision: 'REJECT', reasonCode: 'INVALID_RECEIPT' };
  if (!result.signatureValid) return { decision: 'REJECT', reasonCode: 'INVALID_SIGNATURE' };
  if (!result.hashMatch) return { decision: 'REJECT', reasonCode: 'CONTENT_CHANGED' };
  if (result.certificate?.valid !== true) {
    return { decision: 'REJECT', reasonCode: 'CERTIFICATE_NOT_CURRENT' };
  }
  if (result.trust?.trusted !== true) {
    return { decision: 'REJECT', reasonCode: result.trust?.reason ?? 'UNTRUSTED_ISSUER' };
  }
  return { decision: 'LOAD', reasonCode: 'VERIFIED' };
}

export class Free2PALoadError extends Error {
  constructor(report) {
    super(`Free2PA rejected ${report.asset}: ${report.reasonCode}`);
    this.name = 'Free2PALoadError';
    this.code = report.reasonCode;
    this.report = report;
  }
}

/** Verify a local control file without exposing its content to an agent. */
export async function verifyFileForLoad({
  assetPath,
  sidecarPath = `${assetPath}${SIDECAR_SUFFIX}`,
  trustStore,
  trustCert,
}) {
  if (!assetPath) throw new TypeError('assetPath is required.');
  if (!trustStore && !trustCert) {
    throw new TypeError('trustStore or trustCert is required.');
  }

  const asset = resolve(assetPath);
  const sidecar = resolve(sidecarPath);
  let content;
  let sidecarText;
  try {
    [content, sidecarText] = await Promise.all([
      readFile(asset, 'utf8'),
      readFile(sidecar, 'utf8'),
    ]);
  } catch (error) {
    const missingSidecar = error.code === 'ENOENT' && error.path === sidecar;
    return {
      asset,
      sidecar,
      decision: 'REJECT',
      reasonCode: missingSidecar ? 'SIDECAR_MISSING' : 'FILE_UNREADABLE',
      verification: { success: false, error: error.message },
    };
  }
  const verification = await verifySkill({
    content,
    sidecarText,
    trustProfile: 'dev',
    certPath: trustCert ? resolve(trustCert) : undefined,
    trustStoreDir: trustStore ? resolve(trustStore) : undefined,
  });
  const { decision, reasonCode } = decisionFor(verification);

  const report = {
    asset,
    sidecar,
    decision,
    reasonCode,
    verification,
  };
  if (decision === 'LOAD') report.content = content;
  return report;
}

/** Return verified content, or throw before the caller can load it. */
export async function loadVerifiedFile(options) {
  const report = await verifyFileForLoad(options);
  if (report.decision !== 'LOAD') throw new Free2PALoadError(report);
  return report.content;
}
