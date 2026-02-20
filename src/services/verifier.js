import { createHash, createVerify } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { config } from '../config.js';
import { canonicalJson } from '../utils/canonical.js';

/**
 * Verify a skill.md asset against its Free2PA sidecar.
 *
 * Returns three distinct verdicts:
 *   signatureValid — Did the signature verify against the cert in the sidecar?
 *   hashMatch      — Does SHA-256 of the current file match the stored hash?
 *   trust          — Is the cert trusted under the requested profile?
 *
 * @param {object} opts
 * @param {string} opts.content      Raw text of the current .md file
 * @param {string} opts.sidecarText  Raw text of the .c2pa.json sidecar
 * @param {string} opts.trustProfile 'dev' | 'org' | 'public'
 */
export async function verifySkill({ content, sidecarText, trustProfile = 'dev' }) {
  // ── Parse sidecar ────────────────────────────────────────────────────────
  let sidecar;
  try {
    sidecar = JSON.parse(sidecarText);
  } catch {
    return { success: false, error: 'Sidecar is not valid JSON.' };
  }

  const { claim, signature } = sidecar;
  if (!claim)     return { success: false, error: 'Sidecar is missing "claim".' };
  if (!signature) return { success: false, error: 'Sidecar is missing "signature".' };

  // ── 1. Hash binding ──────────────────────────────────────────────────────
  const currentHash = createHash('sha256').update(content, 'utf-8').digest('hex');
  const hashMatch   = currentHash === claim.asset?.hash;

  // ── 2. Signature ─────────────────────────────────────────────────────────
  let signatureValid = false;
  let signatureError = null;
  try {
    const claimBytes = canonicalJson(claim);
    const verifier   = createVerify('SHA256');
    verifier.update(claimBytes, 'utf-8');
    signatureValid = verifier.verify(signature.cert_pem, signature.value, 'base64');
  } catch (e) {
    signatureError = e.message;
  }

  // ── 3. Trust profile ─────────────────────────────────────────────────────
  const trust = await checkTrust(signature.cert_pem, trustProfile);

  return {
    success:        true,
    signatureValid,
    signatureError,
    hashMatch,
    trust,
    claim,
    spec_version:   sidecar.spec_version,
  };
}

async function checkTrust(certPem, profile) {
  if (profile === 'dev') {
    try {
      const serverCert = await readFile(config.certPath, 'utf-8');
      const trusted    = certPem.trim() === serverCert.trim();
      return {
        profile:  'dev',
        trusted,
        label:    trusted ? 'Classroom/Dev' : 'Not trusted under Classroom/Dev',
        detail:   trusted
          ? 'Cert matches this server\'s signing certificate.'
          : 'Cert does not match this server\'s signing certificate.',
      };
    } catch {
      return { profile: 'dev', trusted: false, label: 'Dev cert unavailable on server.', detail: '' };
    }
  }

  if (profile === 'org') {
    return {
      profile: 'org',
      trusted: null,
      label:   'Org — not yet configured',
      detail:  'Upload a root CA bundle to enable Org trust verification.',
    };
  }

  if (profile === 'public') {
    return {
      profile: 'public',
      trusted: false,
      label:   'Not trusted under Public',
      detail:  'Self-signed cert is not on the C2PA Trust List. Public trust requires a commercially-issued certificate.',
    };
  }

  return { profile, trusted: false, label: 'Unknown profile', detail: '' };
}
