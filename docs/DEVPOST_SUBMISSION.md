# Devpost Submission Draft

## Project name

Free2PA

## Tagline

Stop changed or outside-publisher agent instructions before they load.

## Category

Developer Tools

## Short description

Free2PA is a developer load gate for AI agent control files. It verifies a
signed sidecar before an agent loads prompts, skills, tools, policies, or other
instruction files. If the file changed after signing, or if the publisher is
not in this project's local trust store, Free2PA returns `REJECT` before the
text reaches model context.

## Inspiration

Agent frameworks increasingly rely on editable text files: system prompts,
`AGENTS.md`, `SOUL.md`, `SKILL.md`, tool manifests, policy files, and workflow
definitions. Those files are powerful supply-chain inputs. A one-line change
can redirect every later agent action.

The missing control is simple: before loading one of these files, the host
should know whether this is the exact file someone signed and whether this
project currently trusts that publisher.

Free2PA focuses on temporary, local trust groups: a class, a project team, an
open-source collaboration, or a contractor engagement. These groups do not need
a global registry to get value. They need a verifier they control.

The fit is especially direct for OpenClaw-style projects and other agent apps
where local files define identity, tools, skills, or startup behavior.

## What it does

Free2PA puts a signed receipt beside each protected agent control file.

At load time, the verifier checks four facts:

1. Is the sidecar signature valid?
2. Does the current file match the signed hash?
3. Is the signing certificate current?
4. Is the publisher in this verifier's local trust store?

All four pass: `LOAD`.

Anything fails: `REJECT` with a stable reason code such as `CONTENT_CHANGED`,
`UNTRUSTED_ISSUER`, `INVALID_SIGNATURE`, or `EXPIRED_CERT`.

The host application owns the response policy: block, quarantine, guarded
repair, alert and continue, or log only. Critical instruction files should
normally fail closed.

## Live demo

The live page shows a small Hello World agentic application and the general
Free2PA load gate. The Hello World app reads `SOUL.md`, sends `hello` to the
model, and expects an optimistic greeting. Free2PA is applied at the file-read
boundary before that model call.

The primary changed-file case shows:

- signature passes;
- local publisher trust passes;
- file hash fails;
- the protected app returns `QUARANTINE` / `CONTENT_CHANGED` and skips the
  model call.

The outside-publisher case shows the unique trust model:

- signature passes;
- file hash passes;
- local publisher trust fails;
- the protected app returns `REJECT` / `UNTRUSTED_ISSUER` and skips the model
  call.

The trusted case returns `LOAD`.

## Developer interfaces

Free2PA ships one verification core across multiple developer surfaces:

- CLI for startup scripts and local workflows;
- `free2pa/load-gate` Node API for direct runtime integration;
- HTTP API for local verifier services;
- Streamable HTTP MCP server with `verify_asset`;
- GitHub Action for pull-request enforcement;
- guarded `repair` command;
- installable Codex skill for retrofitting existing agent apps.

The simplest Node integration is:

```js
import { loadVerifiedFile } from 'free2pa/load-gate';

const instructions = await loadVerifiedFile({
  assetPath: 'agent/SOUL.md',
  trustStore: '.free2pa/trusted-publishers',
});

startAgent({ instructions });
```

The file content is returned only when every deterministic check passes.

## Codex and GPT-5.6

Codex was used to turn the original research idea into a distributable
developer tool: CLI, load-gate API, MCP verifier, CI action, Azure-hosted demo,
guarded repair, tests, docs, and an installable Codex integration skill.

The included `$free2pa-protect-agent` skill asks Codex to inspect an existing
agent repository, identify which files enter model context, find the real load
boundary, and wire Free2PA before that read. It also adds tests proving
trusted, changed, and outside-publisher behavior.

GPT-5.6 is optional and deliberately separate from the hard gate. Cryptographic
verification decides whether a file may load. GPT-5.6 can review verified
instructions for behavioral risks such as prompt injection, secret access,
destructive actions, exfiltration, or excessive permissions, but it cannot
turn a failed gate into `LOAD`.

## Technical implementation

The implementation uses Node.js 20, Express, Node's native crypto and X.509
APIs, OpenSSL for publisher identity generation, the Model Context Protocol
SDK, and the OpenAI Responses API for optional GPT-5.6 structured audits.

Signing creates a canonical JSON claim containing:

- SHA-256 hash of the file;
- base64 copy of the signed original;
- publisher certificate;
- signed metadata;
- ES256 signature.

Verification enforces:

- sidecar parse validity;
- declared algorithm support;
- X.509 certificate parse and validity window;
- signature verification over canonical JSON;
- exact-file SHA-256 match;
- membership in the local trust directory.

The test suite covers signing, trust admission and revocation, tamper
detection, outside-publisher rejection, guarded repair, CLI behavior, MCP
structured results, HTTP cleanup/security behavior, and optional GPT-5.6 audit
contracts.

## Why it matters

AI agent security often focuses on model behavior, but the files loaded before
the model runs are just as important. Free2PA gives developers a practical
runtime control for those files without asking them to adopt a permanent public
PKI or manually inspect receipts.

The central idea is verifier-local trust. The same signed, unchanged file can
load in the project that admitted the publisher and fail everywhere else.
Removing a public certificate revokes that publisher on the next verification.

That fits real-world collaboration: classes, hackathon teams, contractors,
client work, open-source maintainers, and short-lived project groups.

## What changed during Build Week

The project began as C2PA-inspired research around provenance for agent skill
files. During Build Week, it was turned into a judgeable developer tool:

- installable CLI;
- explicit local trust-store lifecycle;
- load-gate API;
- generic MCP `verify_asset` tool;
- HTTP verifier;
- guarded repair;
- GitHub Action;
- Codex retrofit skill;
- live load-gate demo;
- optional GPT-5.6 behavioral audit;
- automated test suite and judge fixtures.

## C2PA disclosure

Free2PA is C2PA-inspired but is not a conforming C2PA implementation and does
not claim interoperability with C2PA Content Credentials. It uses a Free2PA
sidecar format to bring signed provenance receipts to text-based agent control
files, then applies a local project trust decision before loading those files.

## Public links

- Live demo: https://free2pa-buildweek.azurewebsites.net
- Repository: https://github.com/kilroyblockchain/free2pa-devtool
- Release: https://github.com/kilroyblockchain/free2pa-devtool/releases/tag/v0.4.2
- Video: https://youtu.be/ENMRlkhARVQ

## Suggested video title

Free2PA: Stop Changed Agent Instructions Before They Load

## Suggested video description

Free2PA is a Developer Tools project for OpenAI Build Week. It verifies signed
sidecars for AI agent control files before those files enter model context. The
demo shows changed instructions blocked as `CONTENT_CHANGED`, a valid
outside-publisher file rejected as `UNTRUSTED_ISSUER`, and a trusted unchanged
file allowed to `LOAD`. Codex helped turn the research prototype into an
installable CLI, Node load gate, MCP verifier, CI action, guarded repair flow,
and retrofit skill. GPT-5.6 is used separately for optional behavioral audit
and never overrides the deterministic trust gate.
