# Judge Guide

Free2PA is a Developer Tools submission for OpenAI Build Week. The fastest
evaluation path uses the public, read-only deployment and requires no account,
rebuild, API key, or payment.

## Live test in two minutes

Open <https://free2pa-buildweek.azurewebsites.net> and select **Demo files**.

1. Verify `trusted/SKILL.md` with its sidecar. Signature, content integrity,
   certificate validity, and local group trust all pass.
2. Verify `outside/SKILL.md` with its sidecar. Its signature and content pass,
   but local trust fails with `UNTRUSTED_ISSUER`.
3. Verify `tampered/SKILL.md` with its sidecar. Its publisher remains trusted,
   but content integrity fails and the changed instruction is displayed.
4. Audit `malicious/SKILL.md`. GPT-5.6 returns structured behavioral findings
   and records the model deployment, provider, audit time, and asset hash.

The hosted verifier is intentionally read-only. Trust-store mutation, signing,
and key generation return HTTP 403 so public visitors cannot alter its policy.

## Install and test

Supported platforms: macOS and Linux. Both require Node.js 20 or newer and
OpenSSL on `PATH`. The build is verified locally on macOS and in public CI on
GitHub-hosted Ubuntu.

```bash
git clone https://github.com/kilroyblockchain/free2pa-devtool.git
cd free2pa-devtool
npm ci
npm test
npm link
free2pa --version
```

Run the bundled deterministic trust cases:

```bash
free2pa scan public/demo/trusted --trust-store demo_certs
free2pa scan public/demo/outside --trust-store demo_certs
```

The first command passes. The second intentionally exits with status 1 and
reports `UNTRUSTED_ISSUER`.

## Interfaces

- CLI: `free2pa --help`
- Browser and HTTP API: `free2pa serve --port 4001`
- MCP: Streamable HTTP at `POST /mcp`
- CI: reusable action in `action.yml`

Public repository: <https://github.com/kilroyblockchain/free2pa-devtool>

Freeware release: <https://github.com/kilroyblockchain/free2pa-devtool/releases/tag/v0.2.1>

Public CI evidence: <https://github.com/kilroyblockchain/free2pa-devtool/actions/runs/29641212445>
