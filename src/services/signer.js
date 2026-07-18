import { createHash, createSign, createVerify } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { config } from '../config.js';
import { canonicalJson } from '../utils/canonical.js';

/**
 * Sign a skill.md asset and return a Free2PA sidecar object.
 *
 * The sidecar contains:
 *   - claim: the manifest (claim_generator, assertions, asset hash)
 *   - signature: ECDSA P-256 signature over canonicalJson(claim)
 *
 * @param {object} opts
 * @param {string}  opts.content      Raw text content of the .md file
 * @param {string}  [opts.title]      dc:title (skill name)
 * @param {string}  [opts.actor]      Author name / handle
 * @param {string}  [opts.email]      Author email address
 * @param {string}  [opts.purpose]    What the skill does
 * @returns {object} Sidecar JSON object
 */
export async function signSkill({ content, title, actor, email, purpose, certPath, keyPath }) {
  const [certPem, keyPem] = await Promise.all([
    readFile(certPath ?? config.certPath, 'utf-8'),
    readFile(keyPath  ?? config.keyPath,  'utf-8'),
  ]);

  const now       = new Date().toISOString();
  const assetHash = createHash('sha256').update(content, 'utf-8').digest('hex');

  // ── Claim ────────────────────────────────────────────────────────────────
  const claim = {
    claim_generator: config.claimGenerator,
    claim_generator_info: [{ name: 'Free2PA', version: config.appVersion }],
    'dc:title': title || 'Untitled Skill',
    asset: {
      format:   'text/markdown',
      hash_alg: 'sha256',
      hash:     assetHash,
      content:  Buffer.from(content, 'utf-8').toString('base64'),
    },
    assertions: [
      {
        label: 'c2pa.actions',
        data: {
          actions: [{
            action:        'c2pa.created',
            when:          now,
            softwareAgent: { name: config.appName, version: config.appVersion },
            ...(actor ? { actor } : {}),
            ...(email ? { email } : {}),
          }],
        },
      },
      {
        label: 'org.free2pa.skill',
        data: {
          ...(purpose ? { purpose } : {}),
        },
      },
    ],
    signed_at: now,
  };

  // ── Sign ─────────────────────────────────────────────────────────────────
  // Sign canonicalJson(claim) with ECDSA P-256 (SHA-256 digest).
  const claimBytes = canonicalJson(claim);
  const signer     = createSign('SHA256');
  signer.update(claimBytes, 'utf-8');
  const signatureB64 = signer.sign(keyPem, 'base64');

  const keyCheck = createVerify('SHA256');
  keyCheck.update(claimBytes, 'utf-8');
  if (!keyCheck.verify(certPem, signatureB64, 'base64')) {
    throw new Error('Signing key does not match the selected certificate.');
  }

  return {
    spec_version: 'free2pa/0.2.0',
    claim,
    signature: {
      alg:      'ES256',
      cert_pem: certPem.trim(),
      value:    signatureB64,
    },
  };
}
