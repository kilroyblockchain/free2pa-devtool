# OpenAI Build Week Development Record

Free2PA began as a research demo for attaching C2PA-inspired sidecars to AI
agent skill files. It was created for a presentation to the University of
Arkansas AI Club and predates OpenAI Build Week. Karen Kilroy, co-chair of the C2PA
AI/ML Task Force, developed it in response to college students working on
OpenClaw agentic nerve centers who needed temporary, ad-hoc publisher trust
groups.

In Free2PA, the Nerve Center means the skills and other critical control files,
such as `SOUL.md`, that shape an agent's behavior. These files may be altered by
an attacker, an untrusted collaborator, or the agent itself. Free2PA does not
claim to prevent every modification; it binds provenance to exact bytes so the
local verifier can detect the change and enforce the group's load policy.

## Build Week baseline

The baseline is commit `1c2d88d`, dated March 15, 2026. At that point the
repository contained:

- an Express demonstration server;
- a browser interface for signing and verifying individual skill files;
- ECDSA P-256 signatures and SHA-256 content binding;
- a local certificate directory used as a development trust store; and
- two MCP tools for listing and verifying bundled example skills.

## Work created during Build Week

Development of the installable Free2PA developer tool began July 17, 2026.
Build Week work is tracked in commits after the baseline and in the Codex
session submitted with the project. This document will be updated as each
judge-visible capability is completed.

Delivered additions:

- a distributable `free2pa` command-line interface;
- recursive repository scanning and CI-friendly exit codes;
- GPT-5.6 behavioral security audits for agent skills;
- automated tests and malicious/tampered fixtures;
- a polished MCP and browser inspection workflow; and
- reproducible installation and judging instructions.

## July 17 progress

- Packaged Free2PA as an Apache-2.0 command-line developer tool.
- Added `keygen`, `sign`, `verify`, and recursive `scan` commands.
- Added explicit algorithm, certificate-validity, integrity, and trust gates.
- Added GPT-5.6 structured behavioral auditing through the Responses API.
- Exposed behavioral auditing through the CLI, HTTP API, browser, and MCP.
- Deployed GPT-5.6 Sol on Azure OpenAI and granted the demo a scoped managed
  identity, avoiding any stored model API key.
- Added shared per-client and global audit limits across HTTP and MCP, locked
  the hosted model selection, and bounded input and output sizes.
- Added end-to-end cryptographic, tamper, trust, CLI, and API-contract tests.
- Updated vulnerable dependencies to a zero-advisory npm audit result.
- Reduced the npm package to judge-relevant runtime files with no private keys.
- Added trusted, outside-group, tampered, and malicious judge fixtures.
- Added a reusable GitHub Action that enforces the verifier's local trust policy
  in pull requests and emits a JSON evidence artifact.
- Verified the reusable action on GitHub-hosted Ubuntu with Node.js 20 in
  [public workflow run 29629741955](https://github.com/kilroyblockchain/free2pa-devtool/actions/runs/29629741955).
- Deployed a read-only verifier to Azure Linux App Service.
- Isolated the hosted policy from all legacy certificates with a clean,
  short-lived Build Week trust store.
- Verified a clean archive install and full test run on July 17.
- Deployed HTTP security headers and disabled framework-identifying responses.
- Audited 129 installed dependency packages: every package declared an MIT,
  BSD, or ISC-family license and none lacked license metadata.
- Re-ran trusted, outside-group, tampered, partial-upload, read-only, HTTP
  security, and configured-auditor checks against the deployed Azure build at
  commit `911ad09`.
- Completed a live public audit at `2026-07-18T03:47:49.504Z` through the
  `free2pa-gpt-5-6` deployment. GPT-5.6 returned a strict `critical` report
  with prompt-injection, secret-access, exfiltration, permission, and deception
  findings for the prepared malicious fixture.
- Validated the managed-identity build on GitHub-hosted Ubuntu.
- Published a focused Apache-2.0 freeware repository and immutable `v0.2.0`
  release after removing historical keys, research material, IDE metadata, and
  dead prototype modules. Every public-history commit passed private-key and
  API-key pattern scanning.

## July 18 progress

- Rendered a 2 minute 45.5 second English explainer with real deployed verdicts,
  GPT-5.6 audit evidence, and CI output. Azure Neural HD supplies the narration.
  The normalized 1080p H.264/AAC file passes a full FFmpeg decode check and
  stays below the three-minute submission limit.
- Replaced third-party-branded CI imagery with a neutral result view for the
  submission video.
- Added a no-account judge guide with exact live-demo and clean-install steps.
- Re-verified the public repository workflow on GitHub-hosted Ubuntu in
  [run 29641212445](https://github.com/kilroyblockchain/free2pa-devtool/actions/runs/29641212445).
- Prepared the final `v0.2.1` patch release and added a regression test that
  keeps CLI and package versions synchronized. The 35 KB tarball installed in
  an empty directory and passed key generation, signing, trust admission, and
  verification through its installed executable.

Codex is being used to inspect the prototype, define the product boundary,
implement and test the new tool, review security-sensitive code, and prepare
the release and submission materials. Product scope, security policy, trust
semantics, and final design decisions remain human-directed.

Karen Kilroy defined the central product model from her experience in college
classes: people form a group and trust one another for a limited purpose and
period. In Free2PA, the verifier's certificate directory is that group's trust
policy. A group can launch its own verifier, add only the publishers it accepts,
and remove a certificate to end that trust without changing signed skills.
