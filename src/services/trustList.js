import { writeFile, unlink, readFile } from 'node:fs/promises';
import { exec }                        from 'node:child_process';
import { promisify }                   from 'node:util';
import { join }                        from 'node:path';
import { tmpdir }                      from 'node:os';
import { config }                      from '../config.js';

const execAsync = promisify(exec);

const TRUST_LIST_URL = 'https://raw.githubusercontent.com/c2pa-org/conformance-public/refs/heads/main/trust-list/C2PA-TRUST-LIST.pem';
const DISK_CACHE     = join(config.certsDir, 'c2pa-trust-list.pem');
const TTL_MS         = 24 * 60 * 60 * 1000; // 24 h

let _cached   = null;  // { pem: string, fetchedAt: number }
let _fetching = null;  // deduplicates concurrent fetches

async function getTrustListPem() {
  if (_cached && Date.now() - _cached.fetchedAt < TTL_MS) return _cached.pem;
  if (_fetching) return _fetching;

  _fetching = (async () => {
    try {
      const resp = await fetch(TRUST_LIST_URL, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const pem = await resp.text();
      _cached   = { pem, fetchedAt: Date.now() };
      // Persist to disk as a fallback for future cold starts
      await writeFile(DISK_CACHE, pem, 'utf-8').catch(() => {});
      return pem;
    } catch (fetchErr) {
      // Fall back to the last-known-good copy on disk
      try {
        const pem = await readFile(DISK_CACHE, 'utf-8');
        // Mark as stale so we retry sooner next time
        _cached = { pem, fetchedAt: Date.now() - TTL_MS + 5 * 60 * 1000 };
        return pem;
      } catch {
        throw fetchErr;
      }
    } finally {
      _fetching = null;
    }
  })();

  return _fetching;
}

/**
 * Check whether certPem chains to any root in the C2PA public trust list.
 *
 * Returns: { trusted: boolean|null, detail: string }
 *   trusted === true   — cert chains to a C2PA trust anchor
 *   trusted === false  — cert does not chain (expected for self-signed dev certs)
 *   trusted === null   — trust list unavailable (network + disk both failed)
 */
export async function checkAgainstC2paTrustList(certPem) {
  let trustListPem;
  try {
    trustListPem = await getTrustListPem();
  } catch (err) {
    return {
      trusted: null,
      detail: `C2PA trust list unavailable: ${err.message}`,
    };
  }

  const id       = Math.random().toString(36).slice(2);
  const certFile = join(tmpdir(), `free2pa-cert-${id}.pem`);
  const listFile = join(tmpdir(), `free2pa-tl-${id}.pem`);

  try {
    await Promise.all([
      writeFile(certFile, certPem, 'utf-8'),
      writeFile(listFile, trustListPem, 'utf-8'),
    ]);

    await execAsync(`openssl verify -CAfile "${listFile}" "${certFile}"`);

    return {
      trusted: true,
      detail: 'Cert chains to a C2PA trust anchor.',
    };
  } catch {
    return {
      trusted: false,
      detail: 'Cert does not chain to any C2PA trust anchor (expected for self-signed / dev certs).',
    };
  } finally {
    await Promise.all([
      unlink(certFile).catch(() => {}),
      unlink(listFile).catch(() => {}),
    ]);
  }
}
