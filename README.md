# Free2PA

**Launch a verifier. Choose the publishers your group trusts. Reject every
agent skill that is unsigned, modified, expired, or outside the group.**

Free2PA is an Apache-2.0 developer tool for forming ad-hoc trust groups around
AI agent skills. A class, project team, short-term collaboration, or agent
operator can run its own verifier and make one explicit policy decision: which
publisher certificates belong in this verifier's trust store?

Trust is local and opt-in. There is no global registry and no permanent trust
relationship. Adding a public certificate admits that publisher. Removing it
revokes trust on the next verification.

Free2PA also uses GPT-5.6 to review what a skill asks an agent to do. The model
can identify behavioral risks, but it cannot override a failed cryptographic
check.

## Live judge demo

**https://free2pa-buildweek.azurewebsites.net**

The hosted verifier is read-only so visitors cannot change its trust policy or
use its signing identity. Its deployment trust store contains only the scoped
Build Week demo publisher and expires after judging. Open **Demo files** in the header to download prepared
fixtures, then use the Verify panel:

1. `trusted/SKILL.md` with its sidecar passes every check.
2. `outside/SKILL.md` with its sidecar has a valid signature and unchanged
   content but fails group trust.
3. `tampered/SKILL.md` with its original sidecar comes from a trusted publisher
   but fails content integrity and displays the changed instruction.
4. `malicious/SKILL.md` is the prepared GPT-5.6 behavioral-audit case.

No account, rebuild, or paid service is required for judge testing.

## The three checks

Every verification answers three separate questions:

| Check | Question |
|---|---|
| Signature | Was this claim signed by the private key for the embedded certificate? |
| Integrity | Does the current file still match the signed SHA-256 asset hash? |
| Group trust | Is that publisher's certificate in this verifier's trust store and currently valid? |

All three must pass. A valid signature proves authorship, not trust. A trusted
publisher cannot make a modified file pass. A behaviorally safe GPT audit
cannot make an unsigned file pass.

## Why ad-hoc trust

The idea came from college classes: people form a group, trust one another for
a particular assignment or semester, and then let that relationship end.
Free2PA expresses that social decision as a verifier configuration.

Examples include:

- a two-person collaboration that exchanges public certificates;
- a project team whose verifier trusts every team member;
- a class verifier populated from an instructor-curated certificate bundle;
- one-way trust where a consuming team accepts a producing team's skills; and
- a temporary collaboration using a short-lived certificate.

Anyone outside the configured group fails the trust check. The same signed
skill may pass one group's verifier and fail another's. That is intentional:
the verifier, not a universal authority, defines the trust boundary.

## Quick start

Prerequisites:

- Node.js 20 or newer
- OpenSSL on `PATH`
- macOS, Linux, or Windows through WSL

```bash
git clone https://github.com/kilroyblockchain/free2pa.git
cd free2pa
npm ci
npm link
free2pa --version
```

Create a short-lived publisher identity:

```bash
free2pa keygen \
  --name "Harmony - Build Week" \
  --id harmony-build-week \
  --days 7 \
  --out-dir .free2pa
```

Sign a skill:

```bash
free2pa sign ./skills/weather/SKILL.md \
  --cert .free2pa/harmony-build-week.crt \
  --key .free2pa/harmony-build-week.key \
  --purpose "Retrieve weather without accessing secrets"
```

## Launch an ad-hoc verifier

Create a trust store and admit a publisher by adding only their public
certificate:

```bash
free2pa trust add .free2pa/harmony-build-week.crt \
  --store ./study-group-certs \
  --id harmony

free2pa trust list --store ./study-group-certs
```

Verify directly against the group's policy:

```bash
free2pa verify ./skills/weather/SKILL.md \
  --trust-store ./study-group-certs
```

Or launch a browser and MCP verifier backed by that same directory:

```bash
free2pa serve \
  --trust-store ./study-group-certs \
  --skills ./skills \
  --port 4001
```

Open `http://127.0.0.1:4001`. To revoke the publisher immediately:

```bash
free2pa trust remove harmony --store ./study-group-certs
```

The signature remains mathematically valid, but the next group verification
fails with `UNTRUSTED_ISSUER`.

## GPT-5.6 security audit

Set a server-side OpenAI API key, then audit a skill:

```bash
export OPENAI_API_KEY="..."
free2pa audit ./skills/weather/SKILL.md --model gpt-5.6
```

The audit returns strict structured findings covering:

- prompt injection;
- secret or credential access;
- data exfiltration;
- destructive actions;
- excessive permissions;
- unsafe downloads and supply-chain behavior; and
- obfuscated instructions.

The skill content is delimited and presented to GPT-5.6 as untrusted data. The
report records the model, audit time, filename, and SHA-256 of the reviewed
content. `critical` and `high` reports produce a nonzero CLI exit code.

## Repository scanning and CI

`scan` recursively finds `SKILL.md` files. Missing sidecars, modified files,
invalid signatures, expired certificates, and publishers outside the supplied
trust store fail the command:

```bash
free2pa scan ./skills --trust-store ./study-group-certs
free2pa scan ./skills --trust-store ./study-group-certs --json
```

Human-readable output is designed for terminals. `--json` and process exit
codes are designed for CI, policy engines, and agent runtimes.

## GitHub Action

Free2PA can reject a pull request when any discovered `SKILL.md` is unsigned,
modified, expired, or published outside the repository's chosen trust group.
Store only public certificates in the trust directory:

```yaml
name: Verify agent skills
on: [pull_request]

permissions:
  contents: read

jobs:
  free2pa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: kilroyblockchain/free2pa@v0.2.0
        with:
          path: skills
          trust-store: .free2pa/trusted-publishers
```

The action writes `free2pa-report.json`, prints the structured report in the
job log, and fails closed when no skills are found or any verification gate
fails. The repository's own workflow runs the action against the judge fixture.

## MCP tools

`POST /mcp` uses Streamable HTTP and exposes:

| Tool | Purpose |
|---|---|
| `list_skills` | List skills visible to this verifier and whether each has a sidecar. |
| `verify_skill` | Return a hard PASS/FAIL from signature, integrity, certificate validity, and local trust. |
| `audit_skill` | Ask GPT-5.6 for an independent structured behavioral security review. |

The intended agent policy is simple: call `verify_skill` before loading an
instruction package. Treat anything other than PASS as unavailable.

## HTTP API

| Endpoint | Purpose |
|---|---|
| `POST /api/sign` | Sign a skill and return its sidecar. |
| `POST /api/verify` | Verify a skill and sidecar against this server's trust store. |
| `POST /api/audit` | Run the GPT-5.6 behavioral audit. |
| `GET /api/certs` | List the verifier's current trusted certificates. |
| `POST /api/certs/import` | Validate and admit one or more public certificates. |
| `POST /api/certs/generate` | Generate a signing identity for local development. |
| `GET /api/skills` | List skills available to the MCP verifier. |
| `GET /health` | Return application health and version. |

Private keys are never accepted by the trust-import endpoint. Only public
X.509 certificates belong in a verifier's trust store.

## C2PA relationship

Free2PA applies Content Credentials ideas to agent instruction files: signed
claims, asset binding, action assertions, local trust decisions, and
human-readable verification reasons.

Free2PA `0.2.0` is **C2PA-inspired, not a conforming C2PA implementation**. Its
portable JSON sidecar is a Free2PA format, not a C2PA Manifest Store. Free2PA
does not claim interoperability with conforming C2PA consumers. This narrow
format is deliberate: ad-hoc groups need a free, inspectable trust gate for
Markdown agent instructions, not permanent public-media PKI.

## OpenAI Build Week

Free2PA existed before OpenAI Build Week as a research and teaching prototype.
The pre-hackathon baseline is commit `1c2d88d` from March 15, 2026.

Only work created after the submission period began is presented as Build Week
work:

| Before Build Week | Added during Build Week |
|---|---|
| Express signing and verification demo | Installable `free2pa` CLI |
| Browser sign/verify panels | `keygen`, `trust`, `sign`, `verify`, `scan`, `audit`, and `serve` commands |
| Local `certs/` trust directory | Complete ad-hoc verifier operator workflow |
| Two MCP tools | GPT-5.6 audit through CLI, HTTP, browser, and MCP |
| Manual happy-path testing | Automated crypto, tamper, trust, CLI, and API-contract tests |
| Prototype package metadata | Apache-2.0 release packaging and zero-advisory dependency tree |
| Boolean trust output | Certificate validity enforcement and structured trust reason codes |

The dated development record is in
[`docs/BUILD_WEEK.md`](docs/BUILD_WEEK.md). The submission checklist is in
[`docs/SUBMISSION_CHECKLIST.md`](docs/SUBMISSION_CHECKLIST.md).

## How we collaborated with Codex

Harmony supplied the central product insight, trust semantics, intended
audience, and scope: the verifier's local certificate set represents a small
group's deliberate and revocable trust decisions. She also chose the
Developer Tools direction and required that the existing research remain
clearly distinguished from new work.

Codex accelerated the Build Week implementation by:

- auditing three related Free2PA repositories and their commit history;
- translating the existing trust model into a distributable CLI workflow;
- implementing certificate lifecycle, signing, verification, scanning, and
  server commands;
- adding GPT-5.6 structured security auditing across four interfaces;
- tightening algorithm, key-pair, certificate-expiration, and trust checks;
- writing end-to-end tests for tampering, outside-group failure, admission,
  and revocation;
- finding and updating vulnerable dependencies; and
- restructuring the product documentation around reproducible judge testing.

Codex was especially useful for rapid implementation and adversarial review.
Harmony made the consequential product and trust-policy decisions, corrected
an early proposal that would have added an unnecessary signed group-policy
format, and kept the implementation aligned with Free2PA's simpler principle:
**the verifier is where trust lives.**

GPT-5.6 contributes directly to the shipped product as the behavioral skill
auditor. Its findings supplement cryptographic verification; they never
replace it.

## Test and release checks

```bash
npm test
npm run check
npm audit
npm pack --dry-run
```

The tests use temporary identities and trust stores. No committed private key
is required.

## Security boundaries

- A public certificate is safe to share; its private key is not.
- Private keys previously committed to any public repository must be treated
  as compromised and rotated.
- Self-signed certificates identify keys, not real-world people. Exchange and
  identity validation remain social or institutional decisions.
- Local trust is intentionally non-transitive. Trusting Team A does not cause
  Team A's trusted publishers to become trusted.
- Removing a certificate affects future verification. It cannot undo an
  action already taken by a running agent.
- TLS, authentication, rate limits, and deployment access controls remain the
  responsibility of a public verifier operator.
- A GPT audit is probabilistic security analysis, not proof of safety.

## License

Apache License 2.0. Free to use, inspect, modify, and redistribute under the
terms in [`LICENSE`](LICENSE).
