# Judge Guide

Free2PA is a Developer Tools submission for OpenAI Build Week.

It solves one developer problem:

> Agent control files are supply-chain inputs. Free2PA verifies them before the
> agent loads them.

The live demo requires no account, rebuild, API key, payment, or uploaded file:

<https://free2pa.org>

## Two-minute evaluation path

1. Open the live demo.
2. Leave **Changed** selected and **Block** as the policy.
3. Click **Run file**.

Expected result:

- The unprotected lane loads the changed instruction file.
- The protected lane calls `/api/verify`.
- Signature passes.
- Publisher trust passes.
- File hash fails.
- The host returns `QUARANTINE` / `CONTENT_CHANGED`.

Then test the other two cases:

| Scenario | What it proves | Expected protected result |
|---|---|---|
| **Outside group** | A real signature is not enough if this verifier does not trust the publisher. | `REJECT` / `UNTRUSTED_ISSUER` |
| **Trusted** | Unchanged file from a locally trusted publisher may load. | `LOAD` / `VERIFIED` |

Optional: switch the policy to **Repair + report** for the changed case. Free2PA
restores only the signed original embedded in a valid, current, locally trusted
receipt.

## Local install and test

Supported platforms: macOS and Linux. Requirements: Node.js 20+ and OpenSSL.

```bash
git clone https://github.com/kilroyblockchain/free2pa-devtool.git
cd free2pa-devtool
npm ci
npm test
```

Run the deterministic fixture checks:

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

## Developer integration surfaces

The same verification core is exposed through:

- CLI: `free2pa verify`, `free2pa scan`, `free2pa repair`
- Node API: `loadVerifiedFile()` from `free2pa/load-gate`
- HTTP API: local verifier service
- MCP: `verify_asset`
- CI: reusable GitHub Action
- Codex skill: `free2pa codex-skill install`

Primary Node integration:

```js
import { loadVerifiedFile } from 'free2pa/load-gate';

const instructions = await loadVerifiedFile({
  assetPath: 'agent/SOUL.md',
  trustStore: '.free2pa/trusted-publishers',
});
```

Primary MCP contract:

```text
verify_asset(content, sidecar) -> LOAD | REJECT
```

## What GPT-5.6 does

GPT-5.6 is optional and deliberately separate.

Free2PA's hard gate is deterministic: signature, hash, certificate window, and
local publisher trust. GPT-5.6 can review behavioral risk in a verified skill,
but it cannot turn a failed gate into `LOAD`.

## Public links

- Repository: <https://github.com/kilroyblockchain/free2pa-devtool>
- Release: <https://github.com/kilroyblockchain/free2pa-devtool/releases/tag/v0.4.2>
- Live demo: <https://free2pa.org>
