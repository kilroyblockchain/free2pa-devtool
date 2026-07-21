# Free2PA

Free2PA stops changed or outside-publisher agent control files before they load.

AI agents read plain-text files that behave like code: system prompts, skills,
tool manifests, policies, `SOUL.md`, `AGENTS.md`, and other startup
instructions. If one of those files changes, every later agent action can
change with it.

Free2PA puts a signed receipt beside each protected file. At load time, your
app asks one question:

```text
May this exact file enter the agent runtime?
```

The verifier checks four facts:

1. the receipt signature is valid;
2. the current file still matches the signed hash;
3. the signing certificate is current; and
4. the publisher is in this project's local trust store.

All four pass: `LOAD`.

Anything fails: `REJECT` with a stable reason code such as
`CONTENT_CHANGED`, `UNTRUSTED_ISSUER`, `INVALID_SIGNATURE`, or `EXPIRED_CERT`.

There is no global registry. Trust lives in the verifier. Add a public
certificate to admit a publisher. Remove it to revoke that publisher on the
next check.

## Judge quick path

Live demo: <https://free2pa.org>

```bash
git clone https://github.com/kilroyblockchain/free2pa-devtool.git
cd free2pa-devtool
npm ci
npm test
```

Run the three deterministic cases:

```bash
node bin/free2pa.js verify public/demo/trusted/SKILL.md --trust-store demo_certs
node bin/free2pa.js verify public/demo/tampered/SKILL.md --trust-store demo_certs
node bin/free2pa.js verify public/demo/outside/SKILL.md --trust-store demo_certs
```

Expected:

```text
trusted  -> PASS
tampered -> FAIL / CONTENT_CHANGED
outside  -> FAIL / UNTRUSTED_ISSUER
```

## The integration developers actually use

For a custom Node agent, put the gate exactly where the app currently reads its
control file:

```js
import { loadVerifiedFile } from 'free2pa/load-gate';

const instructions = await loadVerifiedFile({
  assetPath: 'agent/SOUL.md',
  trustStore: '.free2pa/trusted-publishers',
});

startAgent({ instructions });
```

`loadVerifiedFile()` returns the file content only after every check passes.
Otherwise it throws `Free2PALoadError` before untrusted text reaches the model.

For non-Node apps, use the same verifier through the CLI, HTTP API, MCP server,
or CI action.

## Basic workflow

### 1. Create a publisher identity

```bash
node bin/free2pa.js keygen \
  --name "Project Publisher" \
  --id project-publisher \
  --days 90 \
  --out-dir .free2pa/private
```

Keep the `.key` private. Share only the `.crt`.

### 2. Admit the publisher to this project

```bash
node bin/free2pa.js trust add \
  .free2pa/private/project-publisher.crt \
  --store .free2pa/trusted-publishers \
  --id project-publisher
```

The trust store is the group policy.

### 3. Sign a reviewed control file

```bash
node bin/free2pa.js sign agent/SOUL.md \
  --cert .free2pa/private/project-publisher.crt \
  --key .free2pa/private/project-publisher.key \
  --purpose "Agent identity and behavior instructions"
```

This writes `agent/SOUL.md.c2pa.json` beside the file.

Commit the control file, the sidecar, and the public trusted certificate. Do
not commit the private key.

### 4. Verify before loading

```bash
node bin/free2pa.js verify agent/SOUL.md \
  --trust-store .free2pa/trusted-publishers \
  --json
```

Exit code `0` means the host may load the file. A nonzero exit means the host
must apply its configured failure policy: block, quarantine, guarded repair,
alert and continue, or log only.

## Interfaces

| Interface | Use it when |
|---|---|
| `free2pa verify` | Startup scripts, preflight checks, shell wrappers. |
| `free2pa scan` | CI and pull-request enforcement. |
| `free2pa/load-gate` | Node apps that read prompts, tools, or policy files. |
| HTTP API | Apps that want a local verifier service. |
| MCP `verify_asset` | Agent frameworks that can call a verifier tool before loading content. |
| GitHub Action | Block unsigned, changed, or outside-publisher skill changes in PRs. |
| Codex skill | Ask Codex to retrofit Free2PA into an existing agent app. |

Start the local verifier:

```bash
node bin/free2pa.js serve \
  --trust-store .free2pa/trusted-publishers \
  --skills ./skills \
  --port 4001
```

MCP endpoint:

```text
POST http://127.0.0.1:4001/mcp
```

Primary MCP tool:

```text
verify_asset(content, sidecar) -> LOAD | REJECT
```

## Codex retrofit workflow

Install the included Codex skill:

```bash
node bin/free2pa.js codex-skill install
```

Then open another agent repository in Codex and ask:

```text
Use $free2pa-protect-agent.
Find the files this app loads into model context.
Show me the load boundary and current security checks.
Then add a fail-closed Free2PA gate and tests for trusted, changed,
and outside-publisher cases.
```

Codex should not guess the trust group. The human owner chooses publishers and
failure policy. Codex wires the verifier into the real loader and proves the
boundary.

## Guarded repair

If a trusted file changed after signing, Free2PA can restore the original bytes
embedded in the signed receipt:

```bash
node bin/free2pa.js repair agent/SOUL.md \
  --trust-store .free2pa/trusted-publishers
```

Repair is deliberately narrow. It runs only when:

- the receipt signature is valid;
- the certificate is current;
- the publisher is locally trusted; and
- the embedded original hashes to the signed value.

By default, the rejected file is preserved as evidence.

Repair will not bless changed content, expired credentials, invalid sidecars,
or outside publishers.

## GPT-5.6's role

Cryptography answers:

```text
Who signed this exact file, and does this project trust that publisher?
```

GPT-5.6 can separately review behavior:

```text
Does the verified instruction ask for risky actions?
```

Those are intentionally separate. GPT-5.6 can explain prompt injection, secret
access, destructive actions, and excessive permissions, but it cannot turn a
failed Free2PA gate into `LOAD`.

Configure an OpenAI or Azure OpenAI account only if you want optional
behavioral audits. Signing, verification, trust, repair, load gates, MCP, and
CI do not require a model account.

## What Free2PA protects

Free2PA is useful for text files that shape an agent before or during runtime:

- system prompts;
- `AGENTS.md`, `SOUL.md`, and `SKILL.md`;
- MCP and tool manifests;
- permission and policy files;
- prompt libraries;
- workflow definitions;
- project-specific agent configuration.

That includes OpenClaw-style projects and other agent apps where local files
define identity, tools, skills, or startup behavior.

It detects:

- changed bytes after signing;
- valid files from publishers outside this verifier's trust store;
- expired or not-yet-valid certificates;
- malformed sidecars;
- invalid signatures;
- missing receipts;
- pull requests that introduce unverified control files.

It does not prove that signed instructions are benevolent. Use Free2PA as a
load-time provenance gate, then use code review, tests, least privilege, and
optional GPT-5.6 audit for behavior.

## Scope and no-warranty notice

Free2PA determines two provenance facts about an agent control file:

- the apparent origin of the signed receipt; and
- whether the current file bytes differ from the bytes recorded in that signed
  receipt.

Free2PA does not certify that a file is safe, correct, complete, legal,
non-infringing, secure, authorized for every environment, or suitable for any
particular use. A local verifier may decide to trust a publisher certificate,
but that trust decision belongs to the verifier operator.

Free2PA is provided under the Apache License 2.0 on an "AS IS" basis, without
warranties or conditions of any kind, and with the limitation of liability
stated in the license.

## C2PA relationship

Free2PA is C2PA-style and C2PA-inspired, not a conforming C2PA implementation.
It does not claim interoperability with C2PA Content Credentials and does not
make any claim beyond origin and edit detection for the signed file. It uses a
sidecar format to carry a signed provenance receipt for text-based agent
control files. The goal here is narrower and local: make origin, exact-file
integrity, and project-local publisher trust machine-checkable before an agent
loads the file.

## Development

Prerequisites:

- Node.js 20 or newer
- OpenSSL on `PATH`
- macOS or Linux

Commands:

```bash
npm ci
npm test
npm run check
node bin/free2pa.js --help
```

Package exports:

```js
import { signSkill } from 'free2pa';
import { verifySkill } from 'free2pa';
import { loadVerifiedFile } from 'free2pa/load-gate';
```

License: Apache-2.0.
