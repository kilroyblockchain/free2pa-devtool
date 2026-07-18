# Judge Guide

Free2PA is a Developer Tools submission for OpenAI Build Week. The fastest
evaluation path uses the public, read-only deployment and requires no account,
rebuild, API key, or payment.

The deployment is a reference verifier. The submitted product is the toolkit:
developers install it, provide the public certificates their group accepts,
and integrate the CLI, CI action, HTTP API, or MCP tools into their own system.
The surrounding application consumes the verification result at startup or
file-load time and applies its own programmed response: block, guarded repair,
alert and continue, or log.

## Live test in two minutes

Open <https://free2pa-buildweek.azurewebsites.net>. No files are required for
the primary test; each button calls the submitted verifier with a prepared
public fixture.

1. Leave **Changed** and **Block** selected, then choose **Run file**. The
   unprotected lane loads the changed control file. The protected lane returns
   `SIGN PASS`, `FILE FAIL`, `GROUP PASS`, and `QUARANTINE`.
2. Set the protected policy to **Repair + report** and run again. The protected
   lane returns `RESTORE + REPORT`; the CLI implementation preserves the
   rejected copy and restores only a current, locally trusted signed original.
3. Select **Outside group** and run. Signature and file integrity pass, local
   trust fails with `UNTRUSTED_ISSUER`, and the protected lane rejects it.
4. Select **Trusted** and run. All three gates pass and the protected lane
   returns `LOAD`.
5. Open **Research workbench**, download the behavioral-risk fixture from
   **Demo files**, and run **GPT-5.6 Audit**. The structured result records the
   model, Azure managed-identity provider, audit time, and asset hash.

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

Freeware release: <https://github.com/kilroyblockchain/free2pa-devtool/releases/tag/v0.3.0>

Public CI evidence: <https://github.com/kilroyblockchain/free2pa-devtool/actions/runs/29644256018>
