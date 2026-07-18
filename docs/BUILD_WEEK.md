# OpenAI Build Week Development Record

Free2PA began as a research prototype for attaching C2PA-inspired sidecars to
AI agent skill files. The prototype predates OpenAI Build Week.

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
- Added end-to-end cryptographic, tamper, trust, CLI, and API-contract tests.
- Updated vulnerable dependencies to a zero-advisory npm audit result.
- Reduced the npm package to judge-relevant runtime files with no private keys.
- Added trusted, outside-group, tampered, and malicious judge fixtures.
- Deployed a read-only verifier to Azure Linux App Service.
- Isolated the hosted policy from all legacy certificates with a clean,
  short-lived Build Week trust store.
- Verified a clean archive install and full test run on July 17.
- Deployed HTTP security headers and disabled framework-identifying responses.

Codex is being used to inspect the prototype, define the product boundary,
implement and test the new tool, review security-sensitive code, and prepare
the release and submission materials. Product scope, security policy, trust
semantics, and final design decisions remain human-directed.

Harmony defined the central product model from her experience in college
classes: people form a group and trust one another for a limited purpose and
period. In Free2PA, the verifier's certificate directory is that group's trust
policy. A group can launch its own verifier, add only the publishers it accepts,
and remove a certificate to end that trust without changing signed skills.
