# Free2PA Devpost Final Draft

## Project name

Free2PA

## Tagline

Tamper detection for agent control files before they enter model context.

Alternative if Devpost needs more punch:

Free2PA is the load gate for the files that steer AI agents.

## Category

Developer Tools

## Short public summary

Free2PA is a developer tool that verifies signed receipts for AI agent control
files such as `SOUL.md`, `AGENTS.md`, `SKILL.md`, `TOOLS.md`, prompts, policies,
and tool manifests before their text can enter model context.

If the file still matches its signed receipt and the publisher is trusted by
this verifier, Free2PA returns `LOAD`. If the file changed, the signature is
invalid, the certificate expired, or the publisher is outside this local trust
group, Free2PA returns a machine-readable rejection before the agent consumes
the text.

The Hello World demo shows the core workflow in the smallest possible agent:
an app reads `SOUL.md`, Free2PA verifies the receipt beside it, and only the
verified control file reaches the model. If the file is edited but not signed,
the app keeps using the last verified signed version until a trusted local
console signs the new revision.

## Inspiration

AI agents increasingly depend on plain text files that behave like code:
system prompts, skills, tool manifests, policy documents, and project-specific
files such as `SOUL.md` or `AGENTS.md`. A one-line edit to one of those files
can change every later action the agent takes.

That creates a simple but under-protected supply-chain question:

```text
May this exact file enter the agent runtime?
```

Free2PA was built for short-lived, local trust groups: hackathon teams,
classes, open-source maintainers, contractors, research groups, and product
teams that need to decide who can approve the files their agents load. These
groups do not need a permanent global registry to get practical value. They
need a verifier they control, a public-certificate trust group, and a hard
check at the load boundary.

## What it does

Free2PA puts a signed receipt beside each protected agent control file.

At load time the verifier checks:

1. whether the receipt signature is valid;
2. whether the current file still matches the signed hash;
3. whether the signing certificate is current; and
4. whether the publisher is in this verifier's local trusted-publisher group.

All four pass: `LOAD`.

Anything fails: `REJECT` with a stable reason code such as `CONTENT_CHANGED`,
`UNTRUSTED_ISSUER`, `INVALID_SIGNATURE`, or `EXPIRED_CERT`.

The host app decides the failure policy. For critical control files, the normal
policy should be fail closed. Free2PA also supports guarded repair: when a file
changed after signing but the receipt and publisher are still trusted, the host
can restore the exact signed original embedded in the receipt, preserve the
rejected edit as evidence, report the incident, and run the last verified
version.

The demo also shows an important approval rule: a saved edit is not trusted
just because it matches a previous value. New local revisions do not become
active until they are signed. Until then, the app continues to run the last
verified signed file.

## Live demo story

The public demo opens with a tiny Hello World agent. The left phone is the app
the user is trying to run. The right phone is the local Free2PA verify console.

The agent wants to load `SOUL.md`. Free2PA checks the receipt beside it:

- receipt signature;
- file hash;
- certificate validity;
- local trusted-publisher membership.

When everything matches, Free2PA returns `LOAD`, and the model answers with an
optimistic greeting.

The evaluator can then edit the signed `SOUL.md` control word from `Never` to
`Always`, save it, and run again. That saved revision is not signed yet, so
Free2PA refuses to load the changed bytes. With repair policy enabled, the app
falls back to the last signed version, reports what happened, and keeps
unsigned text out of model context.

If the evaluator signs the saved revision from the local verify console, the
new receipt becomes the active approval. The next run verifies and loads the
new signed control file.

This is the whole product in miniature: agent control files load only after
local provenance and trust checks pass.

## How developers install it

Free2PA can be installed from the public release:

```bash
npm install --save-dev \
  https://github.com/kilroyblockchain/free2pa-devtool/releases/download/v0.4.2/free2pa-0.4.2.tgz
```

Create a publisher identity:

```bash
npx free2pa keygen \
  --name "Project Publisher" \
  --id project-publisher \
  --out-dir .free2pa/private
```

Admit that publisher to the local verifier:

```bash
npx free2pa trust add \
  .free2pa/private/project-publisher.crt \
  --store .free2pa/trusted-publishers \
  --id project-publisher
```

Sign a reviewed control file:

```bash
npx free2pa sign agent/SOUL.md \
  --cert .free2pa/private/project-publisher.crt \
  --key .free2pa/private/project-publisher.key
```

Load it from a Node app:

```js
import { loadVerifiedFile } from 'free2pa/load-gate';

const instructions = await loadVerifiedFile({
  assetPath: 'agent/SOUL.md',
  trustStore: '.free2pa/trusted-publishers',
});

startAgent({ instructions });
```

`loadVerifiedFile()` returns content only after every deterministic check
passes. Otherwise it throws before rejected text reaches the model.

The same verification core also ships as a CLI, HTTP API, MCP `verify_asset`
tool, GitHub Action, and installable Codex retrofit skill.

## Adding team members

Each teammate who can approve control-file revisions gets their own publisher
identity. They generate keys locally:

```bash
npx free2pa keygen \
  --name "Ava from Agent Team" \
  --id ava \
  --out-dir .free2pa/private
```

They share only:

```text
.free2pa/private/ava.crt
```

They never share:

```text
.free2pa/private/ava.key
```

The project owner uploads the public certificate to the verifier's local trust
group:

```bash
npx free2pa trust add ava.crt \
  --store .free2pa/trusted-publishers \
  --id ava
```

If Ava leaves the team:

```bash
npx free2pa trust remove ava \
  --store .free2pa/trusted-publishers
```

Trust is local and revocable. Removing a certificate stops future approvals
from that publisher without changing existing receipts.

## How we built it

Free2PA is implemented in Node.js 20 using Express, Node's native crypto and
X.509 APIs, OpenSSL-generated ECDSA P-256 publisher credentials, the Model
Context Protocol SDK, and optional OpenAI Responses API integration.

The signed sidecar contains a canonical JSON claim, SHA-256 content binding,
an embedded X.509 public certificate, signed metadata, a base64 copy of the
approved original, and an ES256 signature. Verifiers enforce parse validity,
declared algorithm support, certificate validity, signature correctness,
exact-file integrity, and local trusted-publisher membership.

The release includes:

- `free2pa keygen`, `sign`, `verify`, `scan`, `repair`, and `serve`;
- `free2pa/load-gate` for direct Node integration;
- HTTP endpoints for verifier services;
- MCP `verify_asset` for agent frameworks;
- a GitHub Action for pull-request enforcement;
- a Codex skill that retrofits Free2PA into existing agent apps;
- a Hello World reference integration;
- automated tests for signing, tampering, trust, repair, CLI behavior, MCP,
  HTTP behavior, and optional GPT-5.6 audit contracts.

## How Codex and GPT-5.6 were used

Karen Kilroy supplied the product idea, trust model, scope decisions, and
product review. Codex helped turn the research prototype into a shippable
developer tool: it inspected the existing codebase, simplified the product
boundary, implemented the CLI and load-gate API, added MCP and HTTP surfaces,
built the Hello World demo, wrote regression tests, hardened packaging, removed
unrelated material, created the LLM-readable evaluation brief, and prepared the
submission assets.

Codex was also used as part of the product itself. Free2PA includes an
installable `$free2pa-protect-agent` Codex skill. A developer can open an agent
repository and ask Codex to find the real files entering model context, identify
the load boundary, add a fail-closed Free2PA gate, and write tests for trusted,
changed, and outside-publisher cases.

GPT-5.6 is optional and deliberately separate from the hard trust gate.
Cryptography decides whether a control file may load. GPT-5.6 can separately
review verified instructions for behavioral risk such as prompt injection,
secret access, destructive actions, exfiltration, unsafe downloads, or excessive
permissions. GPT-5.6 can explain risk, but it cannot turn a failed provenance
check into `LOAD`.

## Challenges

The hardest product decision was keeping the idea simple. It was tempting to
make Free2PA a broad agent-security dashboard or an AI risk scorer. That would
have made it harder to reason about and harder for developers to install.

The final boundary is intentionally narrow:

```text
Before an agent consumes a control file, verify the signed receipt and local
publisher trust group.
```

Another challenge was approval semantics. If a file is edited and later changed
back to the previous text, it should not silently become an approved new
revision. Free2PA treats local saved edits as pending until signed, which keeps
LLMs and automation from authorizing their own changes by merely reproducing
old bytes.

## Accomplishments

- Shipped a coherent developer tool instead of only a provenance demo.
- Built a simple Hello World agent that demonstrates the real load boundary.
- Added guarded repair that restores only the signed original from a trusted
  receipt and reports the rejected edit.
- Implemented local trusted-publisher groups with public certificates.
- Added direct Node integration through `free2pa/load-gate`.
- Added CLI, HTTP, MCP, CI, and Codex-skill surfaces over the same verifier.
- Published a public Apache-2.0 repository and release package.
- Added LLM-readable judge materials for automated evaluation.
- Verified that private keys and unrelated app material are excluded from the
  public repo and release package.

## What we learned

For many agent teams, trust does not need to be global to be useful. It needs
to be explicit, local, and easy to revoke.

We also learned that provenance and AI review should not be collapsed into one
score. Deterministic checks should decide whether a file may load. LLM review
can help explain behavioral risk after that boundary, but it should not become
the authority that approves untrusted text.

## What's next

- Signed verification-event logs.
- Versioned supersession receipts for approved revisions.
- More framework adapters built on the generic load gate.
- Publisher discovery URLs and certificate fingerprint confirmation.
- Dependency and ingredient assertions for agent control-file bundles.

## C2PA disclosure

Free2PA is C2PA-style and C2PA-inspired, but it is not a conforming C2PA
implementation and does not claim interoperability with C2PA Content
Credentials. It uses a Free2PA sidecar format to bring signed provenance
receipts to text-based agent control files, then applies a local project trust
decision before loading those files.

Free2PA determines origin and edits of a signed file. It does not certify that
the file is safe, correct, complete, legal, non-infringing, secure, authorized
for every environment, or suitable for any particular use. The software is
released under Apache-2.0 on an "AS IS" basis, with no warranties and with the
limitation of liability stated in the license.

## Public links

- Live demo: https://free2pa.org
- Repository: https://github.com/kilroyblockchain/free2pa-devtool
- Release: https://github.com/kilroyblockchain/free2pa-devtool/releases/tag/v0.4.2
- LLM brief: https://free2pa.org/llms.txt
- LLM evaluation: https://free2pa.org/llm-evaluation.md

## Devpost custom-field answers

### Submitter Type

Individual

### Country of Residence

United States

### Category

Developer Tools

### Code repo

https://github.com/kilroyblockchain/free2pa-devtool

### Project for judges to test and necessary instructions

Live demo:

https://free2pa.org

Start with the Hello World demo. Click the green wave button to run the tiny
agent. The Free2PA console shows receipt signature, file hash, certificate, and
trusted-publisher checks before `SOUL.md` enters model context.

To test the changed-file behavior, edit the signed `SOUL.md` control word from
`Never` to `Always`, save, and run again. The saved revision is unsigned, so
Free2PA rejects the changed bytes and the app continues with the last verified
signed file until the new revision is signed.

No credentials are required for judges. The hosted demo uses a scoped Azure
managed identity for its optional model call and does not expose API keys.

Local test path:

```bash
git clone https://github.com/kilroyblockchain/free2pa-devtool.git
cd free2pa-devtool
npm ci
npm run check
npm run demo:hello -- trusted block --fake-model
npm run demo:hello -- changed repair --fake-model
```

### /feedback Session ID

019f72ea-75e0-7670-8c90-48602c610d24

### Dev tool install/testing instructions

Install:

```bash
npm install --save-dev \
  https://github.com/kilroyblockchain/free2pa-devtool/releases/download/v0.4.2/free2pa-0.4.2.tgz
```

Supported platforms:

- macOS and Linux
- Node.js 20+
- no OpenAI account required for core signing, verification, repair, load-gate,
  CLI, HTTP, MCP, or CI workflows

Create a publisher, admit it locally, sign a control file, and verify before
loading:

```bash
npx free2pa keygen --name "Project Publisher" --id project-publisher --out-dir .free2pa/private
npx free2pa trust add .free2pa/private/project-publisher.crt --store .free2pa/trusted-publishers --id project-publisher
npx free2pa sign agent/SOUL.md --cert .free2pa/private/project-publisher.crt --key .free2pa/private/project-publisher.key
npx free2pa verify agent/SOUL.md --trust-store .free2pa/trusted-publishers --json
```

For Node apps:

```js
import { loadVerifiedFile } from 'free2pa/load-gate';

const instructions = await loadVerifiedFile({
  assetPath: 'agent/SOUL.md',
  trustStore: '.free2pa/trusted-publishers',
});
```

The same verifier is available through the CLI, HTTP API, MCP `verify_asset`,
GitHub Action, and an installable Codex retrofit skill.
