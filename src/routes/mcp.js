import { Router } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from '../config.js';
import { verifySkill } from '../services/verifier.js';
import { auditSkill } from '../services/auditor.js';
import { consumeAuditAllowance } from '../services/auditLimit.js';

const router = Router();

function isValidName(name) {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

const verificationOutputSchema = {
  asset: z.string(),
  verdict: z.enum(['PASS', 'FAIL']),
  decision: z.enum(['LOAD', 'REJECT']),
  signature_valid: z.boolean(),
  file_unchanged: z.boolean(),
  certificate_current: z.boolean(),
  publisher_trusted: z.boolean(),
  reason_code: z.string(),
  publisher: z.string(),
  certificate_fingerprint: z.string(),
};

export function buildVerificationVerdict(result, asset = 'Nerve Center file') {
  const signatureValid = result.signatureValid === true;
  const fileUnchanged = result.hashMatch === true;
  const certificateCurrent = result.certificate?.valid === true;
  const publisherTrusted = result.trust?.trusted === true;
  const pass = signatureValid && fileUnchanged && certificateCurrent && publisherTrusted;

  let reasonCode = 'VERIFIED';
  if (!signatureValid) reasonCode = 'INVALID_SIGNATURE';
  else if (!fileUnchanged) reasonCode = 'CONTENT_CHANGED';
  else if (!certificateCurrent) reasonCode = 'EXPIRED_CERT';
  else if (!publisherTrusted) reasonCode = result.trust?.reason || 'UNTRUSTED_ISSUER';

  return {
    asset,
    verdict: pass ? 'PASS' : 'FAIL',
    decision: pass ? 'LOAD' : 'REJECT',
    signature_valid: signatureValid,
    file_unchanged: fileUnchanged,
    certificate_current: certificateCurrent,
    publisher_trusted: publisherTrusted,
    reason_code: reasonCode,
    publisher: result.certificate?.subject || '',
    certificate_fingerprint: result.certificate?.fingerprint256 || '',
  };
}

function verificationResponse(result, asset) {
  if (result.success !== true) {
    return {
      content: [{ type: 'text', text: `Free2PA verification error: ${result.error}` }],
      isError: true,
    };
  }

  const verdict = buildVerificationVerdict(result, asset);
  return {
    structuredContent: verdict,
    content: [{ type: 'text', text: JSON.stringify(verdict, null, 2) }],
  };
}

export function buildMcpServer(clientId = 'mcp') {
  const server = new McpServer({
    name:    'Free2PA',
    version: config.appVersion,
  });

  // ── Tool: list_skills ────────────────────────────────────────────────────
  server.tool(
    'list_skills',
    'List all skills available in the configured skill directory, with whether each has a verification sidecar.',
    {},
    async () => {
      try {
        const entries = await readdir(config.skillsDir, { withFileTypes: true });
        const skills = [];

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          try {
            await readFile(resolve(config.skillsDir, entry.name, 'SKILL.md'));
            let hasSidecar = false;
            try {
              await readFile(resolve(config.skillsDir, entry.name, 'SKILL.md.c2pa.json'));
              hasSidecar = true;
            } catch {}
            skills.push({ name: entry.name, hasSidecar });
          } catch {}
        }

        return { content: [{ type: 'text', text: JSON.stringify(skills, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );

  server.registerTool(
    'verify_asset',
    {
      title: 'Verify a Nerve Center file',
      description: 'Verify an arbitrary agent control file and its Free2PA sidecar against this server\'s local trust group. Call this programmatically before the host loads the file into agent or model context. PASS permits LOAD; every failure returns REJECT with separate signature, file, certificate, and publisher-trust facts.',
      inputSchema: {
        asset_name: z.string().min(1).max(255).default('Nerve Center file'),
        content: z.string().max(1024 * 1024).describe('Exact UTF-8 contents of the current control file (maximum 1 MiB)'),
        sidecar: z.string().max(512 * 1024).describe('Exact JSON text from the neighboring .c2pa.json sidecar (maximum 512 KiB)'),
      },
      outputSchema: verificationOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ asset_name: assetName, content, sidecar }) => {
      const result = await verifySkill({ content, sidecarText: sidecar, trustProfile: 'dev' });
      return verificationResponse(result, assetName);
    },
  );

  // ── Tool: verify_skill ───────────────────────────────────────────────────
  server.tool(
    'verify_skill',
    'Verify a named skill from the configured skill directory against its C2PA sidecar. Returns PASS or FAIL with signature, hash, and trust details.',
    { name: z.string().describe('Skill folder name in the configured skill directory (e.g. "weather")') },
    async ({ name }) => {
      if (!isValidName(name)) {
        return { content: [{ type: 'text', text: 'Error: Invalid skill name.' }], isError: true };
      }

      const mdPath      = resolve(config.skillsDir, name, 'SKILL.md');
      const sidecarPath = resolve(config.skillsDir, name, 'SKILL.md.c2pa.json');

      try {
        const [content, sidecarText] = await Promise.all([
          readFile(mdPath,      'utf-8'),
          readFile(sidecarPath, 'utf-8'),
        ]);

        const result = await verifySkill({ content, sidecarText, trustProfile: 'dev' });
        return verificationResponse(result, `${name}/SKILL.md`);
      } catch (err) {
        if (err.code === 'ENOENT') {
          const missing = String(err.path).endsWith('.c2pa.json') ? 'sidecar' : 'SKILL.md';
          return {
            content: [{ type: 'text', text: `Error: Missing ${missing} for skill "${name}".` }],
            isError: true,
          };
        }
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );

  server.tool(
    'audit_skill',
    'Use the operator-configured optional LLM auditor to review a bundled skill for prompt injection, secret access, data exfiltration, destructive actions, and excessive permissions. This behavioral assessment is independent of cryptographic verification.',
    { name: z.string().describe('Skill folder name in the configured skills directory') },
    async ({ name }) => {
      if (!isValidName(name)) {
        return { content: [{ type: 'text', text: 'Error: Invalid skill name.' }], isError: true };
      }
      try {
        const content = await readFile(resolve(config.skillsDir, name, 'SKILL.md'), 'utf8');
        if (!consumeAuditAllowance(clientId)) {
          return {
            content: [{ type: 'text', text: 'Error: Hourly LLM audit limit reached.' }],
            isError: true,
          };
        }
        const report = await auditSkill({ content, filename: `${name}/SKILL.md` });
        return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    },
  );

  return server;
}

// POST /mcp — Streamable HTTP MCP endpoint (stateless per-request)
router.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const mcpServer = buildMcpServer(req.ip);
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
  res.on('finish', () => mcpServer.close().catch(() => {}));
});

// GET /mcp — surface the MCP endpoint URL for discoverability
router.get('/mcp', (_req, res) => {
  res.json({
    mcp:       'Free2PA MCP Server',
    version:   config.appVersion,
    transport: 'streamable-http',
    endpoint:  'POST /mcp',
    tools:     ['verify_asset', 'verify_skill', 'list_skills', 'audit_skill'],
  });
});

export default router;
