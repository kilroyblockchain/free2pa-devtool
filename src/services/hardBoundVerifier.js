/**
 * Hard-bound C2PA manifest verification.
 *
 * Hard-bound manifests are embedded directly in the asset file using JUMBF
 * containers (ISO 19566-5), as specified in C2PA Specification v2.3 §7.
 * This is the default binding mechanism for real-world C2PA content from
 * Adobe, Leica, Nikon, Truepic, and other publishers.
 *
 * Unlike the Free2PA soft-bound (sidecar) approach, no separate .c2pa.json
 * file is needed — the manifest is embedded inside the image bytes and
 * cryptographically bound to those bytes (C2PA §6.8).
 *
 * Trust evaluation for hard-bound images is performed entirely by the
 * @trustnxt/c2pa-ts library, which validates the full certificate chain
 * (including intermediates from the COSE x5chain) against C2PA trust anchors.
 * The separate openssl-based check used for soft-bound images is NOT applied
 * here — it would only receive the leaf certificate and give incorrect results.
 *
 * Spec references:
 *   §6   Manifests
 *   §6.8 Asset binding (hard binding)
 *   §6.9 Signatures (COSE)
 *   §7   JUMBF embedding
 *   §8   Validation
 *   §9   Trust model
 */

import { JPEG, PNG, BMFF } from '@trustnxt/c2pa-ts/asset';
import { SuperBox }         from '@trustnxt/c2pa-ts/jumbf';
import { ManifestStore, ValidationStatusCode } from '@trustnxt/c2pa-ts/manifest';

// ValidationStatusCodes that indicate the COSE signature passed
const SIG_SUCCESS_CODES = new Set([
  ValidationStatusCode.ClaimSignatureValidated,
]);

// ValidationStatusCodes that indicate a signature failure
const SIG_FAIL_CODES = new Set([
  ValidationStatusCode.ClaimSignatureMismatch,
  ValidationStatusCode.ClaimSignatureMissing,
]);

// ValidationStatusCodes that indicate asset hash binding passed
const HASH_SUCCESS_CODES = new Set([
  ValidationStatusCode.AssertionDataHashMatch,
  ValidationStatusCode.AssertionBMFFHashMatch,
  ValidationStatusCode.AssertionBoxesHashMatch,
  ValidationStatusCode.AssertionCollectionHashMatch,
]);

// ValidationStatusCodes that indicate asset hash binding failed
const HASH_FAIL_CODES = new Set([
  ValidationStatusCode.AssertionDataHashMismatch,
  ValidationStatusCode.AssertionBMFFHashMismatch,
  ValidationStatusCode.AssertionBoxesHashMismatch,
  ValidationStatusCode.AssertionCollectionHashMismatch,
]);

// Trust status codes from the library's own validation
const TRUST_SUCCESS_CODES = new Set([
  ValidationStatusCode.SigningCredentialTrusted,
]);
const TRUST_FAIL_CODES = new Set([
  ValidationStatusCode.SigningCredentialUntrusted,
  ValidationStatusCode.SigningCredentialInvalid,
  ValidationStatusCode.SigningCredentialExpired,
]);

/**
 * Attempt to create the appropriate asset wrapper from a buffer.
 * AssetSource = Uint8Array | Blob; Node.js Buffer extends Uint8Array.
 */
async function openAsset(buf) {
  if (await JPEG.canRead(buf)) return JPEG.create(buf);
  if (await PNG.canRead(buf))  return PNG.create(buf);
  if (await BMFF.canRead(buf)) return BMFF.create(buf);
  return null;
}

/**
 * Derive signatureValid and hashMatch verdicts from a ValidationResult.
 * The library's statusEntries have a `success` field; however not all
 * implementations set it, so we also match against known success/fail codes.
 */
function parseVerdicts(validationResult) {
  const entries = validationResult.statusEntries ?? [];

  let signatureValid = false;
  let hashMatch      = false;
  let sigSeen        = false;
  let hashSeen       = false;

  for (const e of entries) {
    if (SIG_SUCCESS_CODES.has(e.code)) { signatureValid = true; sigSeen = true; }
    if (SIG_FAIL_CODES.has(e.code))   { signatureValid = false; sigSeen = true; }
    if (HASH_SUCCESS_CODES.has(e.code)) { hashMatch = true;  hashSeen = true; }
    if (HASH_FAIL_CODES.has(e.code))   { hashMatch = false; hashSeen = true; }
  }

  // If no explicit sig/hash codes, fall back to the top-level isValid flag
  if (!sigSeen && !hashSeen) {
    signatureValid = validationResult.isValid;
    hashMatch      = validationResult.isValid;
  } else if (!sigSeen) {
    signatureValid = validationResult.isValid;
  } else if (!hashSeen) {
    hashMatch = validationResult.isValid;
  }

  return { signatureValid, hashMatch };
}

/**
 * Build a plain claim object from a parsed Manifest for UI display.
 * Returns only serialisable fields (no class instances).
 */
function buildClaim(manifest) {
  const c = manifest.claim;
  if (!c) return null;

  const claim = {
    claimGenerator:  c.claimGeneratorName,
    format:          c.format,
    title:           c.title,
    instanceID:      c.instanceID,
    signed_at:       manifest.signature?.signatureData?.timestamp?.toISOString?.() ?? null,
  };

  // Add assertion labels for reference
  const assertions = manifest.assertions?.assertions ?? [];
  claim.assertions = assertions.map(a => ({
    label:  a.fullLabel ?? a.label,
  }));

  return claim;
}

/**
 * Classify a manifest parse/validate error into a user-friendly message.
 *
 * Common root causes for real-world C2PA images:
 *   - "Failed to deserialize signature content" / "Malformed credentials":
 *     The COSE x5chain field is in an unexpected location (both protected and
 *     unprotected buckets, or zero candidates).
 *   - "algorithm.unsupported": The image uses a signing algorithm not yet
 *     implemented by @trustnxt/c2pa-ts (e.g., ES384, PS256, RSA-PSS).
 *   - "Compressed manifests are not supported": The manifest uses JUMBF
 *     compression (xz/brotli) which the library does not handle.
 */
function classifyParseError(err) {
  const msg = err?.message ?? String(err);

  if (msg.includes('deserialize signature') || msg.includes('Malformed credential')) {
    return `C2PA manifest found but the COSE signature structure is not supported by the current parser. ` +
           `This may be caused by a non-standard x5chain placement in the COSE header. ` +
           `(parser detail: ${msg})`;
  }
  if (msg.includes('algorithm.unsupported') || msg.includes('algorithm')) {
    return `C2PA manifest found but uses an unsupported signing algorithm. ` +
           `The parser currently supports ES256 (ECDSA P-256). (parser detail: ${msg})`;
  }
  if (msg.includes('Compressed manifests')) {
    return `C2PA manifest found but uses JUMBF compression which is not yet supported by the parser.`;
  }
  return `Manifest parse error: ${msg}`;
}

/**
 * Verify a hard-bound C2PA manifest embedded in an image buffer.
 *
 * Trust is evaluated by the @trustnxt/c2pa-ts library's internal chain
 * validation (C2PA §9). The `checkC2pa` parameter is accepted for API
 * compatibility but has no effect — the library already checks the full
 * COSE certificate chain against C2PA trust anchors during validate().
 *
 * @param {object}  opts
 * @param {Buffer}  opts.imageBuffer  Raw image bytes
 * @param {string}  [opts.mimeType]   MIME type hint (optional, unused)
 * @param {boolean} [opts.checkC2pa]  Accepted but unused; trust is always
 *                                    evaluated by the library internally.
 *
 * @returns {object} Result with shape:
 *   { success, hasEmbeddedManifest, binding?, signatureValid?, hashMatch?, trust?, claim? }
 */
export async function verifyHardBound({ imageBuffer, mimeType, checkC2pa = false } = {}) {
  // ── 1. Open asset ────────────────────────────────────────────────────────
  let asset;
  try {
    asset = await openAsset(imageBuffer);
  } catch (err) {
    return { success: false, hasEmbeddedManifest: false, error: `Asset open error: ${err.message}` };
  }

  if (!asset) {
    return { success: false, hasEmbeddedManifest: false, error: 'Unsupported asset format (expected JPEG, PNG, or BMFF/MP4).' };
  }

  // ── 2. Extract embedded JUMBF bytes ──────────────────────────────────────
  let jumbfBytes;
  try {
    jumbfBytes = await asset.getManifestJUMBF();
  } catch (err) {
    return { success: false, hasEmbeddedManifest: false, error: `JUMBF read error: ${err.message}` };
  }

  if (!jumbfBytes || jumbfBytes.byteLength === 0) {
    // No embedded C2PA manifest — caller should fall back to sidecar verification
    return { success: true, hasEmbeddedManifest: false };
  }

  // ── 3. Parse JUMBF → ManifestStore (C2PA §7) ─────────────────────────────
  // Note: ManifestStore.read() deserialises the COSE signature structure.
  // Some real-world C2PA images fail here if they use non-standard x5chain
  // placement or signing algorithms not yet implemented in the library.
  let store;
  try {
    const superBox = SuperBox.fromBuffer(jumbfBytes);
    store          = ManifestStore.read(superBox);
  } catch (err) {
    return {
      success:             false,
      hasEmbeddedManifest: true,
      error:               classifyParseError(err),
    };
  }

  const manifest = store.getActiveManifest();
  if (!manifest) {
    return { success: false, hasEmbeddedManifest: true, error: 'Manifest store contains no active manifest.' };
  }

  // ── 4. Validate: COSE signature + asset hash binding (C2PA §6.8, §6.9, §8) ──
  let validationResult;
  try {
    validationResult = await store.validate(asset);
  } catch (err) {
    return { success: false, hasEmbeddedManifest: true, error: `Validation error: ${err.message}` };
  }

  const { signatureValid, hashMatch } = parseVerdicts(validationResult);

  // ── 5. Trust evaluation (C2PA §9) ────────────────────────────────────────
  // The library validates the full COSE x5chain (leaf + intermediates) against
  // C2PA trust anchors and reports the result via SigningCredentialTrusted /
  // SigningCredentialUntrusted status codes.  We read those codes directly.
  // We do NOT run a separate openssl check: that would only have the leaf cert
  // and would incorrectly report "untrusted" for legitimate commercial CA chains.
  const entries = validationResult.statusEntries ?? [];

  let libTrusted = null;  // null = no trust code present
  for (const e of entries) {
    if (TRUST_SUCCESS_CODES.has(e.code)) { libTrusted = true;  break; }
    if (TRUST_FAIL_CODES.has(e.code))   { libTrusted = false; break; }
  }

  let trust;
  if (libTrusted === true) {
    trust = {
      profile: 'c2pa-public',
      trusted: true,
      label:   'C2PA / CAI Trust List',
      detail:  'Signing certificate chain verified against C2PA trust anchors.',
    };
  } else if (libTrusted === false) {
    trust = {
      profile: 'c2pa-public',
      trusted: false,
      label:   'Not in C2PA Trust List',
      detail:  'Signing certificate does not chain to a known C2PA trust anchor.',
    };
  } else {
    // No trust code emitted — report as not evaluated
    trust = {
      profile: 'c2pa-public',
      trusted: null,
      label:   'C2PA Trust — not evaluated',
      detail:  'Trust status was not explicitly reported by the validator.',
    };
  }

  // ── 6. Build result ───────────────────────────────────────────────────────
  return {
    success:             true,
    binding:             'hard',
    hasEmbeddedManifest: true,
    signatureValid,
    signatureError:      signatureValid ? null : 'COSE signature did not verify.',
    hashMatch,
    trust,
    claim:               buildClaim(manifest),
    // Raw status codes for advanced inspection
    validationStatusCodes: validationResult.statusEntries.map(e => e.code),
  };
}
