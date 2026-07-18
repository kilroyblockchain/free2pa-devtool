import { X509Certificate } from 'node:crypto';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

export function certificateSlug(value) {
  return value.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function inspectCertificate(certPem, now = new Date()) {
  const certificate = new X509Certificate(certPem);
  const validFrom = new Date(certificate.validFrom);
  const validTo = new Date(certificate.validTo);
  const timestamp = now.getTime();
  return {
    subject: certificate.subject,
    issuer: certificate.issuer,
    fingerprint256: certificate.fingerprint256,
    validFrom: validFrom.toISOString(),
    validTo: validTo.toISOString(),
    current: timestamp >= validFrom.getTime() && timestamp <= validTo.getTime(),
  };
}

export async function addTrustedCertificate({ sourcePath, trustStore, id, overwrite = false } = {}) {
  const certPem = await readFile(sourcePath, 'utf8');
  const info = inspectCertificate(certPem);
  const certificateId = certificateSlug(id || basename(sourcePath, '.crt'));
  if (!certificateId) throw new Error('Cannot derive a valid certificate ID.');
  const directory = resolve(trustStore || 'certs');
  const destination = resolve(directory, `${certificateId}.crt`);
  await mkdir(directory, { recursive: true });
  if (!overwrite) {
    try {
      await readFile(destination);
      throw new Error(`Trusted certificate already exists: ${destination}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await copyFile(sourcePath, destination);
  return { id: certificateId, path: destination, ...info };
}

export async function listTrustedCertificates(trustStore = 'certs') {
  const directory = resolve(trustStore);
  await mkdir(directory, { recursive: true });
  const files = (await readdir(directory)).filter((file) => file.endsWith('.crt')).sort();
  return Promise.all(files.map(async (file) => {
    const path = resolve(directory, file);
    try {
      const info = inspectCertificate(await readFile(path, 'utf8'));
      return { id: basename(file, '.crt'), path, valid: true, ...info };
    } catch (error) {
      return { id: basename(file, '.crt'), path, valid: false, error: error.message };
    }
  }));
}

export async function removeTrustedCertificate({ trustStore = 'certs', id } = {}) {
  const certificateId = certificateSlug(id || '');
  if (!certificateId || certificateId !== id) throw new Error('A valid certificate ID is required.');
  const path = resolve(trustStore, `${certificateId}.crt`);
  await unlink(path);
  return { id: certificateId, path };
}

function cleanSubjectValue(value, fallback) {
  const cleaned = String(value ?? fallback).replace(/[\r\n]/g, ' ').trim();
  if (!cleaned) throw new Error('Certificate subject values cannot be empty.');
  return cleaned.slice(0, 128);
}

export async function generateSigningCertificate({
  name,
  org = 'Free2PA',
  validityDays = 365,
  outputDir = '.free2pa',
  id,
  overwrite = false,
} = {}) {
  const commonName = cleanSubjectValue(name, 'Free2PA Publisher');
  const organization = cleanSubjectValue(org, 'Free2PA');
  const slug = certificateSlug(id || commonName);
  if (!slug) throw new Error('Certificate name must contain a letter or number.');

  const days = Math.min(Math.max(Number.parseInt(validityDays, 10) || 365, 1), 3650);
  const directory = resolve(outputDir);
  const keyPath = resolve(directory, `${slug}.key`);
  const certPath = resolve(directory, `${slug}.crt`);
  const configPath = resolve(directory, `.free2pa-${slug}-${process.pid}.cnf`);

  await mkdir(directory, { recursive: true });

  if (!overwrite) {
    for (const path of [keyPath, certPath]) {
      try {
        await readFile(path);
        throw new Error(`Refusing to overwrite existing file: ${path}`);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }

  const config = [
    '[req]',
    'distinguished_name = dn',
    'x509_extensions = v3',
    'prompt = no',
    '',
    '[dn]',
    `O = ${organization}`,
    `CN = ${commonName}`,
    '',
    '[v3]',
    'basicConstraints = critical, CA:FALSE',
    'keyUsage = critical, digitalSignature',
    'subjectKeyIdentifier = hash',
  ].join('\n');

  try {
    await writeFile(configPath, config, { mode: 0o600 });
    await execFileP('openssl', [
      'genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:P-256',
      '-out', keyPath,
    ]);
    await execFileP('openssl', [
      'req', '-new', '-x509', '-key', keyPath, '-out', certPath,
      '-days', String(days), '-config', configPath,
    ]);
    return { id: slug, keyPath, certPath, validityDays: days };
  } catch (error) {
    await Promise.all([
      unlink(keyPath).catch(() => {}),
      unlink(certPath).catch(() => {}),
    ]);
    throw error;
  } finally {
    await unlink(configPath).catch(() => {});
  }
}
