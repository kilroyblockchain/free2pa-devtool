---
name: free2pa-protect-agent
description: Add Free2PA provenance and local trust checks to an agentic application. Use when a developer asks to protect an agent, OpenClaw project, ChatGPT app, MCP server, Agents SDK workflow, skills, prompts, SOUL.md, AGENTS.md, policies, or other control files from unnoticed changes or outside-group publishers.
---

# Protect an Agent with Free2PA

Make the files that tell an agent who it is and what it can do tamper-evident.
Free2PA puts a signed receipt beside each protected file, then checks the file
and the project's own trust group before the application loads it.

## Workflow

### 1. Find the Nerve Center

Inspect the application before editing. Identify every local file that can
change model instructions, tool availability, permissions, identity, memory,
or startup behavior. Typical examples include:

- `SKILL.md`, `SOUL.md`, `AGENTS.md`, and system-prompt files;
- MCP and tool manifests;
- agent, policy, workflow, and permission configuration; and
- files read into model context during startup.

Call this collection the project's **Nerve Center** in user-facing output. Do
not claim that every application uses these exact filenames.

### 2. Define the ad-hoc group

Ask who is allowed to publish Nerve Center files if the repository does not
make that clear. Keep trust local to this project. Never admit a certificate or
sign unexplained file changes merely to make verification pass.

### 3. Install the pinned Free2PA release

For a Node project, install the freeware release as a development dependency:

```bash
npm install --save-dev \
  https://github.com/kilroyblockchain/free2pa-devtool/releases/download/v0.3.0/free2pa-0.3.0.tgz
```

Verify the archive against the `SHA256SUMS` asset on the same GitHub release
when the environment supports it.
For non-Node applications, run the CLI as a build or startup prerequisite
instead of rewriting its cryptography.

### 4. Add a programmatic load gate

Create a project-local trust directory and a manifest listing protected files.
Wire verification immediately before the application reads those files. Make
the response policy explicit: block or quarantine, repair and report, alert and
continue, or log only. Recommend fail-closed blocking for critical identity,
permission, tool, and system-instruction files, but preserve the developer's
chosen policy.

Read [integration-patterns.md](references/integration-patterns.md) for the
language-neutral contract and Node bootstrap example. Adapt it to the existing
framework instead of replacing the application's loader architecture.

### 5. Sign reviewed files

Generate or use an approved publisher identity. Keep the private key outside
version control. Share only the public certificate. Sign each reviewed Nerve
Center file so its `.c2pa.json` receipt sits beside it.

An agent changing its own `SOUL.md` is still a change. Do not silently re-sign
it. Show the diff and require the group owner to decide whether the new version
becomes trusted provenance.

For automatic recovery, use `free2pa repair`. It may restore the original
content embedded in the receipt only after signature, certificate validity,
and local group trust pass. Preserve the rejected file as evidence. Never use
repair to admit an outside publisher or bless the changed bytes.

### 6. Prove the boundary

Add automated tests for all three cases:

1. approved publisher plus unchanged file loads;
2. one changed byte quarantines the file; and
3. valid signature from a publisher outside the group is rejected.

Consume nonzero CLI exit codes or structured HTTP/MCP results in code, without
requiring a human to watch a dashboard. GPT behavioral review may explain
risky instructions, but it must never change the cryptographic result.

### 7. Report in plain language

Tell the developer:

- which files form this application's Nerve Center;
- whose public certificates the project trusts;
- exactly where verification blocks loading;
- how to add or remove a group member; and
- the results of the trusted, changed, and outside-group tests.

Describe the sidecar first as a signed receipt. Use certificate, ECDSA, and
SHA-256 details only when the audience needs implementation detail.
