import { createHash, createVerify, X509Certificate } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
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
export async function verifySkill({ content, sidecarText, trustProfile = 'dev', certPath }) {
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
  if (signature.alg !== 'ES256') {
    return { success: false, error: `Unsupported signature algorithm: ${signature.alg ?? '(missing)'}.` };
  }
  if (claim.asset?.hash_alg !== 'sha256' || typeof claim.asset?.hash !== 'string') {
    return { success: false, error: 'Sidecar has an invalid or unsupported asset hash.' };
  }

  let certificate;
  try {
    const parsed = new X509Certificate(signature.cert_pem);
    const now = Date.now();
    const validFrom = new Date(parsed.validFrom);
    const validTo = new Date(parsed.validTo);
    certificate = {
      subject: parsed.subject,
      issuer: parsed.issuer,
      fingerprint256: parsed.fingerprint256,
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
      valid: now >= validFrom.getTime() && now <= validTo.getTime(),
    };
  } catch (error) {
    return { success: false, error: `Sidecar contains an invalid signing certificate: ${error.message}` };
  }

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
  let trust = await checkTrust(signature.cert_pem, trustProfile, certPath);
  if (!certificate.valid) {
    trust = {
      profile: trustProfile,
      trusted: false,
      reason: 'EXPIRED_CERT',
      label: 'Signing certificate is not current',
      detail: `Certificate validity window: ${certificate.validFrom} through ${certificate.validTo}.`,
    };
  }

  return {
    success:        true,
    signatureValid,
    signatureError,
    hashMatch,
    trust,
    certificate,
    claim,
    spec_version:   sidecar.spec_version,
  };
}

async function checkTrust(certPem, profile, certPathOverride) {
  if (profile === 'dev') {
    // ── Specific cert selected: strict match against that cert only ──────────
    if (certPathOverride) {
      try {
        const specificCert = await readFile(certPathOverride, 'utf-8');
        const trusted      = certPem.trim() === specificCert.trim();
        const certId       = basename(certPathOverride, '.crt');
        return {
          profile: 'dev',
          trusted,
          reason:  trusted ? 'EXPLICIT_MATCH' : 'UNTRUSTED_ISSUER',
          label:   trusted ? 'Server/Dev' : 'Not trusted under Server/Dev',
          detail:  trusted
            ? `Cert matches selected certificate: ${certId}`
            : `Cert does not match selected certificate: ${certId}`,
        };
      } catch {
        return { profile: 'dev', trusted: false, reason: 'TRUST_STORE_UNAVAILABLE', label: 'Server/Dev', detail: 'Selected cert file could not be read.' };
      }
    }

    // ── No cert selected: check against every cert in the trust store ────────
    // Trusted if the sidecar cert matches ANY cert this server knows about.
    try {
      const files = await readdir(config.certsDir);
      const crtFiles = files.filter(f => f.endsWith('.crt'));

      for (const file of crtFiles) {
        try {
          const stored = await readFile(resolve(config.certsDir, file), 'utf-8');
          if (certPem.trim() === stored.trim()) {
            const certId = basename(file, '.crt');
            return {
              profile: 'dev',
              trusted: true,
              reason:  'LOCAL_TRUST',
              label:   'Server/Dev',
              detail:  `Cert is in this server's trust store (matched: ${certId})`,
            };
          }
        } catch {}
      }

      return {
        profile: 'dev',
        trusted: false,
        reason:  'UNTRUSTED_ISSUER',
        label:   'Not trusted under Server/Dev',
        detail:  'Cert does not match any certificate in this server\'s trust store.',
      };
    } catch {
      return { profile: 'dev', trusted: false, reason: 'TRUST_STORE_UNAVAILABLE', label: 'Server/Dev', detail: 'Trust store unavailable.' };
    }
  }

  if (profile === 'org') {
    return {
      profile: 'org',
      trusted: null,
      reason:  'PROFILE_NOT_CONFIGURED',
      label:   'Org — not yet configured',
      detail:  'Configure a shared CA bundle to enable org-wide trust verification.',
    };
  }

  if (profile === 'public') {
    return {
      profile: 'public',
      trusted: false,
      reason:  'UNTRUSTED_ISSUER',
      label:   'Not trusted under Public',
      detail:  'Self-signed cert is not on a public trust list. Public trust requires a commercially-issued certificate.',
    };
  }

  return { profile, trusted: false, reason: 'UNKNOWN_PROFILE', label: 'Unknown profile', detail: '' };
}
