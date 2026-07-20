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
   unchecked lane loads the altered file. The protected lane returns
   `SIGN PASS`, `FILE FAIL`, and `GROUP PASS`, then `QUARANTINE`.
2. Set the policy to **Repair + report** and run again. Free2PA verifies the
   embedded original, returns `RESTORE + REPORT`, and preserves the rejected
   copy as evidence in the command-line workflow.
3. Select **Outside group** and run again. Signature and file integrity pass,
   local trust fails with `UNTRUSTED_ISSUER`, and the host returns `REJECT`.
4. Select **Trusted**. Every gate passes and the host returns `LOAD`.
5. Open **Hello World example** to inspect one real LLM host integration, or
   open **Research workbench**, download the behavioral-risk fixture from
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

The repository's Hello World agent uses the operator's configured OpenAI or
Azure OpenAI account:

```bash
npm run demo:hello -- trusted
npm run demo:hello -- changed
npm run demo:hello -- changed repair
```

## Interfaces

- CLI: `free2pa --help`
- Browser and HTTP API: `free2pa serve --port 4001`
- MCP: Streamable HTTP at `POST /mcp`
- CI: reusable action in `action.yml`

The MCP server's primary integration tool is `verify_asset`. A host sends the
exact control-file text and its sidecar before loading the file into model
context. The structured response includes `verdict`, `decision`, four separate
gate booleans, and a stable `reason_code`. `decision: "LOAD"` is returned only
when signature, file integrity, certificate validity, and local publisher
trust all pass.

Public repository: <https://github.com/kilroyblockchain/free2pa-devtool>

Freeware release: <https://github.com/kilroyblockchain/free2pa-devtool/releases/tag/v0.4.1>

Public CI evidence: <https://github.com/kilroyblockchain/free2pa-devtool/actions/runs/29704365424>
