import { Router } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from '../config.js';
import { verifySkill } from '../services/verifier.js';
import { auditSkill } from '../services/auditor.js';

const router = Router();

function isValidName(name) {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

function buildMcpServer() {
  const server = new McpServer({
    name:    'Free2PA',
    version: config.appVersion,
  });

  // ── Tool: list_skills ────────────────────────────────────────────────────
  server.tool(
    'list_skills',
    'List all skills available in radio_intern, with whether each has a verification sidecar.',
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

  // ── Tool: verify_skill ───────────────────────────────────────────────────
  server.tool(
    'verify_skill',
    'Verify a skill from radio_intern against its C2PA sidecar. Returns PASS or FAIL with signature, hash, and trust details.',
    { name: z.string().describe('Skill folder name in radio_intern (e.g. "weather")') },
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
        const pass   = result.signatureValid && result.hashMatch &&
          result.certificate?.valid !== false && result.trust?.trusted === true;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              skill:          name,
              verdict:        pass ? 'PASS' : 'FAIL',
              signatureValid: result.signatureValid,
              hashMatch:      result.hashMatch,
              certificate:    result.certificate,
              trust:          result.trust,
            }, null, 2),
          }],
        };
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
    'Use GPT-5.6 to review a bundled skill for prompt injection, secret access, data exfiltration, destructive actions, and excessive permissions. This behavioral assessment is independent of cryptographic verification.',
    { name: z.string().describe('Skill folder name in the configured skills directory') },
    async ({ name }) => {
      if (!isValidName(name)) {
        return { content: [{ type: 'text', text: 'Error: Invalid skill name.' }], isError: true };
      }

      try {
        const content = await readFile(resolve(config.skillsDir, name, 'SKILL.md'), 'utf8');
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
  const mcpServer = buildMcpServer();
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
    tools:     ['list_skills', 'verify_skill', 'audit_skill'],
  });
});

export default router;
