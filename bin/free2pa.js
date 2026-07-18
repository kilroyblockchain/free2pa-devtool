#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import process from 'node:process';
import { auditSkill, DEFAULT_AUDIT_MODEL } from '../src/services/auditor.js';
import {
  addTrustedCertificate,
  generateSigningCertificate,
  listTrustedCertificates,
  removeTrustedCertificate,
} from '../src/services/certificates.js';
import { config } from '../src/config.js';
import { signSkill } from '../src/services/signer.js';
import { verifySkill } from '../src/services/verifier.js';

const VERSION = '0.2.1';
const SIDECAR_SUFFIX = '.c2pa.json';

function usage() {
  return `Free2PA ${VERSION} - provenance and security for AI agent skills

Usage:
  free2pa keygen [--name NAME] [--org ORG] [--out-dir DIR] [--days N]
  free2pa sign <SKILL.md> [--cert FILE] [--key FILE] [--out FILE]
  free2pa verify <SKILL.md> [--sidecar FILE] [--trust-store DIR] [--json]
  free2pa scan [DIR] [--trust-store DIR] [--json]
  free2pa audit <SKILL.md> [--model MODEL] [--out FILE] [--json]
  free2pa trust add <CERT.crt> [--store DIR] [--id ID]
  free2pa trust list [--store DIR] [--json]
  free2pa trust remove <ID> [--store DIR]
  free2pa serve [--trust-store DIR] [--skills DIR] [--port N] [--host HOST] [--read-only]

Common options:
  --help               Show command help
  --version            Show the Free2PA version

Sign metadata:
  --title TEXT          Human-readable skill title
  --actor TEXT          Publisher name or handle
  --email TEXT          Publisher email
  --purpose TEXT        One-sentence purpose of the skill

Environment defaults:
  FREE2PA_CERT          Signing or trust certificate path
  FREE2PA_KEY           Signing private-key path`;
}

function parseArguments(values) {
  const positional = [];
  const options = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) {
      positional.push(value);
      continue;
    }

    const separator = value.indexOf('=');
    if (separator !== -1) {
      options[value.slice(2, separator)] = value.slice(separator + 1);
      continue;
    }

    const key = value.slice(2);
    const next = values[index + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }

  return { positional, options };
}

function requireValue(value, message) {
  if (!value) throw new Error(message);
  return value;
}

function verdict(result) {
  return Boolean(
    result.success &&
    result.signatureValid &&
    result.hashMatch &&
    result.certificate?.valid !== false &&
    result.trust?.trusted === true
  );
}

function printVerification(assetPath, result) {
  const passed = verdict(result);
  console.log(`${passed ? 'PASS' : 'FAIL'} ${assetPath}`);
  if (!result.success) {
    console.log(`  error: ${result.error}`);
    return;
  }
  console.log(`  signature: ${result.signatureValid ? 'valid' : 'invalid'}`);
  console.log(`  content:   ${result.hashMatch ? 'unchanged' : 'modified'}`);
  console.log(`  trust:     ${result.trust?.trusted ? 'trusted' : 'untrusted'}`);
  if (result.certificate) {
    console.log(`  cert:      ${result.certificate.valid ? 'current' : 'expired or not yet valid'}`);
  }
}

async function keygen(options) {
  const generated = await generateSigningCertificate({
    name: options.name || 'Free2PA Publisher',
    org: options.org || 'Free2PA',
    validityDays: options.days || 365,
    outputDir: options['out-dir'] || '.free2pa',
    id: options.id,
    overwrite: options.overwrite === true,
  });
  console.log('Created a Free2PA publisher identity:');
  console.log(`  certificate: ${generated.certPath}`);
  console.log(`  private key: ${generated.keyPath}`);
  console.log('Keep the private key secret. Share only the certificate.');
}

async function sign(assetArgument, options) {
  const assetPath = resolve(requireValue(assetArgument, 'sign requires a skill file path.'));
  const certPath = resolve(options.cert || process.env.FREE2PA_CERT || '.free2pa/free2pa-publisher.crt');
  const keyPath = resolve(options.key || process.env.FREE2PA_KEY || '.free2pa/free2pa-publisher.key');
  const outputPath = resolve(options.out || `${assetPath}${SIDECAR_SUFFIX}`);
  const content = await readFile(assetPath, 'utf8');
  const sidecar = await signSkill({
    content,
    title: options.title || basename(assetPath, extname(assetPath)),
    actor: options.actor,
    email: options.email,
    purpose: options.purpose,
    certPath,
    keyPath,
  });
  await writeFile(outputPath, `${JSON.stringify(sidecar, null, 2)}\n`, { mode: 0o644 });
  console.log(`Signed ${assetPath}`);
  console.log(`Sidecar ${outputPath}`);
}

async function verify(assetArgument, options) {
  if (options['trust-store']) config.certsDir = resolve(options['trust-store']);
  const assetPath = resolve(requireValue(assetArgument, 'verify requires a skill file path.'));
  const sidecarPath = resolve(options.sidecar || `${assetPath}${SIDECAR_SUFFIX}`);
  const trustCert = options['trust-cert'] || process.env.FREE2PA_CERT;
  const [content, sidecarText] = await Promise.all([
    readFile(assetPath, 'utf8'),
    readFile(sidecarPath, 'utf8'),
  ]);
  const result = await verifySkill({
    content,
    sidecarText,
    trustProfile: 'dev',
    certPath: trustCert ? resolve(trustCert) : undefined,
  });
  if (options.json) console.log(JSON.stringify({ asset: assetPath, passed: verdict(result), ...result }, null, 2));
  else printVerification(assetPath, result);
  return verdict(result);
}

async function audit(assetArgument, options) {
  const assetPath = resolve(requireValue(assetArgument, 'audit requires a skill file path.'));
  const content = await readFile(assetPath, 'utf8');
  const report = await auditSkill({
    content,
    filename: basename(assetPath),
    model: options.model || process.env.OPENAI_MODEL || DEFAULT_AUDIT_MODEL,
  });
  if (options.out) {
    const outputPath = resolve(options.out);
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o644 });
    if (!options.json) console.log(`Audit report ${outputPath}`);
  }
  if (options.json || !options.out) console.log(JSON.stringify(report, null, 2));
  return !['critical', 'high'].includes(report.overall_risk);
}

async function trust(arguments_, options) {
  const [action, value] = arguments_;
  const store = options.store || process.env.CERTS_DIR || 'certs';
  if (action === 'add') {
    const added = await addTrustedCertificate({
      sourcePath: resolve(requireValue(value, 'trust add requires a .crt file path.')),
      trustStore: store,
      id: options.id,
      overwrite: options.overwrite === true,
    });
    console.log(`Trusted ${added.id}`);
    console.log(`  fingerprint: ${added.fingerprint256}`);
    console.log(`  expires:     ${added.validTo}`);
    return 0;
  }
  if (action === 'list') {
    const certificates = await listTrustedCertificates(store);
    if (options.json) console.log(JSON.stringify({ trustStore: resolve(store), certificates }, null, 2));
    else if (!certificates.length) console.log(`No trusted certificates in ${resolve(store)}`);
    else for (const cert of certificates) {
      console.log(`${cert.valid && cert.current ? 'ACTIVE' : 'INACTIVE'} ${cert.id}`);
      console.log(`  ${cert.valid ? cert.fingerprint256 : cert.error}`);
    }
    return 0;
  }
  if (action === 'remove') {
    const removed = await removeTrustedCertificate({ trustStore: store, id: value });
    console.log(`Removed ${removed.id} from ${resolve(store)}`);
    return 0;
  }
  throw new Error('trust requires one of: add, list, remove.');
}

async function serve(options) {
  config.certsDir = resolve(options['trust-store'] || process.env.CERTS_DIR || 'certs');
  config.skillsDir = resolve(options.skills || process.env.SKILLS_DIR || '.');
  config.uploadDir = resolve(options.uploads || process.env.UPLOAD_DIR || 'uploads');
  if (options['read-only']) config.readOnly = true;
  const port = Number.parseInt(options.port || process.env.PORT || '4001', 10);
  const host = options.host || process.env.HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535.');
  const { createServer } = await import('../src/server.js');
  const app = await createServer();
  const server = app.listen(port, host, () => {
    console.log(`Free2PA verifier listening at http://${host}:${port}`);
    console.log(`  trust store: ${config.certsDir}`);
    console.log(`  skill root:  ${config.skillsDir}`);
  });
  await new Promise((resolvePromise, reject) => {
    server.on('error', reject);
    const close = () => server.close(resolvePromise);
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
  });
  return 0;
}

async function findSkillFiles(root) {
  const found = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name.toLowerCase() === 'skill.md') found.push(path);
    }
  }
  await visit(root);
  return found.sort();
}

async function scan(directoryArgument, options) {
  if (options['trust-store']) config.certsDir = resolve(options['trust-store']);
  const root = resolve(directoryArgument || '.');
  const assets = await findSkillFiles(root);
  const results = [];

  for (const asset of assets) {
    try {
      const content = await readFile(asset, 'utf8');
      const sidecarText = await readFile(`${asset}${SIDECAR_SUFFIX}`, 'utf8');
      const trustCert = options['trust-cert'] || process.env.FREE2PA_CERT;
      const result = await verifySkill({
        content,
        sidecarText,
        trustProfile: 'dev',
        certPath: trustCert ? resolve(trustCert) : undefined,
      });
      results.push({ asset, passed: verdict(result), ...result });
    } catch (error) {
      results.push({ asset, passed: false, success: false, error: error.code === 'ENOENT' ? 'Sidecar not found.' : error.message });
    }
  }

  const passed = results.length > 0 && results.every((result) => result.passed);
  if (options.json) {
    console.log(JSON.stringify({ root, passed, count: results.length, results }, null, 2));
  } else {
    for (const result of results) printVerification(result.asset, result);
    console.log(`\n${passed ? 'PASS' : 'FAIL'} ${results.filter((item) => item.passed).length}/${results.length} skills verified`);
  }
  return passed;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, options } = parseArguments(rest);

  if (!command || command === 'help' || options.help) {
    console.log(usage());
    return 0;
  }
  if (command === '--version' || command === 'version') {
    console.log(VERSION);
    return 0;
  }

  switch (command) {
    case 'keygen': await keygen(options); return 0;
    case 'sign': await sign(positional[0], options); return 0;
    case 'verify': return (await verify(positional[0], options)) ? 0 : 1;
    case 'scan': return (await scan(positional[0], options)) ? 0 : 1;
    case 'audit': return (await audit(positional[0], options)) ? 0 : 1;
    case 'trust': return trust(positional, options);
    case 'serve': return serve(options);
    default: throw new Error(`Unknown command: ${command}`);
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`free2pa: ${error.message}`);
  process.exitCode = 2;
}
