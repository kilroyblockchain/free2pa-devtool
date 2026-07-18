# Free2PA

**Agent frameworks put developers in the driver's seat. Free2PA is the seat
belt for the files that steer the agent.**

Free2PA puts a signed receipt beside the files that tell an AI agent who it is
and what it can do. Before the agent uses one, Free2PA checks that the file has
not changed and that it came from someone this group trusts.

It is an Apache-2.0 developer tool for making an agent's critical control files
tamper-evident inside an ad-hoc trust group. A class, project team, short-term
collaboration, or agent operator runs its own verifier and chooses whose files
that particular group will accept.

Karen Kilroy, co-chair of the C2PA AI/ML Task Force, conceived the original research
demo in response to a practical need: college students collaborating on
OpenClaw agentic nerve centers needed temporary, ad-hoc publisher trust groups.
Here, the **Nerve Center** is the agent's critical control surface: its skills,
`SOUL.md`, and the other instructions and configuration that shape what the
agent can do. Those files can change because of an external attack, an edit by
someone outside the group, or an agent rewriting its own control files.
Free2PA calls the signed receipt a sidecar. It is bound to the exact file,
makes any later change visible, and lets the local verifier decide whether the
Nerve Center may load that file.

This happens programmatically. An agent runner, startup hook, CI job, or MCP
client consumes Free2PA's exit code or structured result at load time. The host
application can block or quarantine the file, alert and continue, or only log
the event. For critical instructions, fail-closed blocking is the recommended
default; Free2PA reports the facts and the developer chooses the response.

For a changed file whose receipt is still valid, current, and locally trusted,
`free2pa repair` can restore the signed original programmatically while keeping
the rejected version as evidence. It refuses repair from an invalid, expired,
or outside-group receipt. This supports a fourth policy: stop, repair, and
report without silently trusting new content.

Trust is local and opt-in. There is no global registry and no permanent trust
relationship. Adding a public certificate admits that publisher. Removing it
revokes trust on the next verification.

Free2PA also uses GPT-5.6 to review what a skill asks an agent to do. The model
can identify behavioral risks, but it cannot override a failed cryptographic
check.

## Live judge demo

**https://free2pa-buildweek.azurewebsites.net**

This deployment is a reference implementation and judge sandbox, not a hosted
trust authority. The product is the toolkit in this repository. Developers run
Free2PA in their own environment, supply their own publisher certificate set,
and connect its CLI, CI action, HTTP API, or MCP tools to the agent workflow
they want to protect.

The hosted verifier is read-only so visitors cannot change its trust policy or
use its signing identity. Its deployment trust store contains only the scoped
Build Week demo publisher and expires after judging. The home page is a live
Agentic Factory that runs the same Nerve Center file through agent lanes with
and without Free2PA:

1. Run **Changed** with **Block**. The unprotected agent loads the file, while
   the live Free2PA lane returns `SIGN PASS`, `FILE FAIL`, `GROUP PASS`, and
   `QUARANTINE`.
2. Select **Repair + report** and run **Changed** again. The host can restore
   the signed original and preserve the rejected copy as evidence.
3. Run **Outside group**. The signature and file pass, but local group trust
   fails and the protected lane rejects the file.
4. Run **Trusted**. Every gate passes and the protected lane loads the file.

The original sign, verify, diff, and GPT-5.6 audit interface remains available
through **Research workbench** in the header. Its **Demo files** menu provides
the exact public fixtures used by the factory.

The same integrity gate can protect other text-based Nerve Center controls,
including `SOUL.md`; `SKILL.md` is the focused reference implementation used
by this release and demo.

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

Supported platforms and prerequisites:

- macOS or Linux (verified on macOS and GitHub-hosted Ubuntu)
- Node.js 20 or newer
- OpenSSL on `PATH`

```bash
git clone https://github.com/kilroyblockchain/free2pa-devtool.git
cd free2pa-devtool
npm ci
npm link
free2pa --version
```

Install the included Codex integration skill with one command:

```bash
free2pa codex-skill install
```

Then ask Codex: `Make this agent application tamper-evident for our project
trust group.` Codex maps the application's Nerve Center, wires programmatic
verification into its load boundary, and tests trusted, changed, and
outside-group files. The developer still approves publishers and signing.

Create a short-lived publisher identity:

```bash
free2pa keygen \
  --name "Karen Kilroy - Build Week" \
  --id karen-build-week \
  --days 7 \
  --out-dir .free2pa
```

Sign a skill:

```bash
free2pa sign ./skills/weather/SKILL.md \
  --cert .free2pa/karen-build-week.crt \
  --key .free2pa/karen-build-week.key \
  --purpose "Retrieve weather without accessing secrets"
```

## Launch an ad-hoc verifier

Create a trust store and admit a publisher by adding only their public
certificate:

```bash
free2pa trust add .free2pa/karen-build-week.crt \
  --store ./study-group-certs \
  --id karen

free2pa trust list --store ./study-group-certs
```

Verify directly against the group's policy:

```bash
free2pa verify ./skills/weather/SKILL.md \
  --trust-store ./study-group-certs
```

Restore the trusted signed version after a failed integrity check:

```bash
free2pa repair ./skills/weather/SKILL.md \
  --trust-store ./study-group-certs \
  --json
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
free2pa trust remove karen --store ./study-group-certs
```

The signature remains mathematically valid, but the next group verification
fails with `UNTRUSTED_ISSUER`.

## GPT-5.6 security audit

For direct OpenAI API use, set a server-side API key and audit a skill:

```bash
export OPENAI_API_KEY="..."
free2pa audit ./skills/weather/SKILL.md --model gpt-5.6
```

The server also supports Azure OpenAI v1 through `AZURE_OPENAI_ENDPOINT` and
`AZURE_OPENAI_DEPLOYMENT`. Local operators may provide
`AZURE_OPENAI_API_KEY`; Azure App Service can instead use a system-assigned
managed identity with the `Cognitive Services OpenAI User` role. The hosted
judge demo uses managed identity and stores no model credential.

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
content. Requests cap model output and reject skill files larger than 64 KiB.
`critical` and `high` reports produce a nonzero CLI exit code.

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
      - uses: actions/checkout@v7
      - uses: kilroyblockchain/free2pa-devtool@v0.3.0
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

The agent calls `verify_skill` before loading an instruction package and
consumes the structured result directly. A high-risk Nerve Center can treat
anything other than PASS as unavailable; other applications may alert and
continue or log the event according to their explicit response policy.

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

C2PA has a formal conformance program. Conforming Content Credentials are
verified by conforming verifiers, providing an interoperable provenance layer.

Free2PA `0.3.0` is **C2PA-inspired, not a conforming C2PA implementation**. It
uses sidecar files to carry C2PA-style provenance credentials in a Free2PA
format, not a C2PA Manifest Store, and does not claim interoperability with
conforming C2PA products. A signed publisher identity traces origin, while
asset binding reveals edits. Free2PA then addresses an adjacent local-policy
question for an agentic nerve center: which publishers does this temporary
group choose to trust? It is not a replacement for C2PA conformance.

## OpenAI Build Week

Free2PA existed before OpenAI Build Week as a research demo created for a
presentation to the University of Arkansas AI Club. The pre-hackathon baseline
is commit `1c2d88d` from March 15, 2026.

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

For a two-minute, no-install evaluation path, see
[`docs/JUDGE_GUIDE.md`](docs/JUDGE_GUIDE.md).

## How we collaborated with Codex

Karen Kilroy supplied the central product insight, trust semantics, intended
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
Karen made the consequential product and trust-policy decisions, corrected
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
