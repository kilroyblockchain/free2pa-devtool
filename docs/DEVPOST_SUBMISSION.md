# Devpost Submission Draft

## Project name

Free2PA

## Tagline

Launch an ad-hoc verifier and trust only the AI agent-skill publishers your
group chooses.

## Category

Developer Tools

## Inspiration

People form temporary trust groups constantly. A college class trusts its
members for a semester. Two teams trust each other for one assignment. A
project accepts a contractor's work for the length of an engagement.

AI agent skills are executable instructions, but most skill-sharing workflows
do not preserve a deliberate answer to two separate questions: who published
this exact file, and does this particular group trust that publisher?

Public provenance infrastructure is designed for broad, durable ecosystems.
Free2PA explores the smaller and more immediate case: a group that wants to
stand up its own verifier, admit a few public certificates, and reject everyone
outside that boundary.

## What it does

Free2PA signs AI agent skill files with ECDSA P-256 credentials and binds each
credential to the exact file content with SHA-256. A verifier checks:

1. whether the credential signature is valid;
2. whether the skill is unchanged; and
3. whether the publisher belongs to that verifier's local trust group.

The trust store is the policy. Adding a public certificate admits a publisher.
Removing it revokes trust on the next verification without modifying any
credential. Trust can be one-way, team-wide, class-wide, or deliberately
short-lived.

GPT-5.6 adds an independent structured behavioral audit for prompt injection,
secret access, data exfiltration, destructive actions, unsafe downloads,
supply-chain behavior, and excessive permissions. Cryptographic verification
remains the hard gate; the model cannot turn a failed credential into a pass.

Developers can use Free2PA through an installable CLI, browser interface, HTTP
API, or Streamable HTTP MCP server. JSON output and nonzero exit codes support
CI and agent-policy enforcement.

## How we built it

The implementation uses Node.js 20, Express, the Model Context Protocol SDK,
OpenSSL, Node's native cryptography and X.509 APIs, and the OpenAI Responses API
with a strict JSON schema for GPT-5.6 audits. The public Azure deployment calls
GPT-5.6 Sol through a scoped managed identity, so no model API key is stored.

The signing envelope contains a canonical JSON claim, SHA-256 content binding,
an embedded X.509 public certificate, and an ES256 signature. Verifiers enforce
the declared algorithm, current certificate validity, signature correctness,
content integrity, and local certificate membership. Trust results include
machine-readable reason codes such as `LOCAL_TRUST`, `EXPLICIT_MATCH`,
`UNTRUSTED_ISSUER`, and `EXPIRED_CERT`.

## How we used Codex and GPT-5.6

Harmony supplied the central product concept and made the key trust-policy and
scope decisions. Codex audited three related research repositories, helped
select the focused agent-skill baseline, implemented the distributable CLI and
verifier workflow, added tests and security hardening, reviewed dependency and
browser risks, and prepared reproducible release and judging materials.

Codex accelerated implementation but did not define the trust model. During
development, Harmony rejected an unnecessary signed group-policy layer and
restated the simpler invariant that now anchors the product: the verifier is
where trust lives.

GPT-5.6 is part of the running product. It evaluates a skill's behavioral risk
as untrusted input and returns structured evidence, impact, and remediation.

## Challenges

The hardest design problem was keeping authenticity, integrity, trust, and
behavioral safety separate. Combining them into one AI-generated score would
make the system difficult to reason about. Free2PA instead uses deterministic
cryptographic gates and presents GPT-5.6 analysis as a distinct assessment.

Another challenge was making a research prototype judge-ready without claiming
old work as new. The repository identifies commit `cd5c2c3` as the pre-event
baseline and documents every submitted Build Week extension separately.

## Accomplishments

- Complete ad-hoc verifier lifecycle from the command line.
- Outside-group rejection, certificate admission, and immediate revocation.
- Tamper detection with a human-readable diff.
- GPT-5.6 structured audits through CLI, HTTP, browser, and MCP.
- Reusable GitHub Action for pull-request trust enforcement and JSON evidence.
- Automated tests covering signing, trust, tampering, CLI behavior, and API
  contracts.
- Read-only and rate-limited public-demo mode.
- Zero known npm vulnerabilities at release-check time.
- Apache-2.0 packaging with private keys excluded.

## What we learned

Trust does not need to be global to be useful. For small agent ecosystems, a
flat, explicit, non-transitive trust store is often easier to operate and audit
than permanent public PKI. We also learned that provenance and behavioral
review complement one another only when their responsibilities remain clear.

## What's next

- Signed verification-event logs for group accountability.
- Optional skill dependency and ingredient assertions.
- GitHub Action templates for changed-skill policy checks.
- Publisher discovery URLs and certificate fingerprint confirmation.
- Versioned supersession and provenance-completeness assertions.

## C2PA disclosure

Free2PA applies C2PA-inspired Content Credentials concepts to agent instruction
files, but Free2PA `0.2.0` is not a conforming C2PA implementation and does not
claim C2PA consumer interoperability. Its JSON sidecar is a Free2PA format.

## Submission links

- Repository: https://github.com/kilroyblockchain/free2pa-devtool
- Freeware release: https://github.com/kilroyblockchain/free2pa-devtool/releases/tag/v0.2.0
- Live demo: https://free2pa-buildweek.azurewebsites.net
- YouTube demo: `TODO`
- Primary Codex `/feedback` Session ID: `019f72ea-75e0-7670-8c90-48602c610d24`

## Judge testing instructions

No account, rebuild, API key, or payment is required.

1. Open the live demo and select **Demo files**.
2. Verify the trusted fixture and observe that all cryptographic and local-trust
   gates pass.
3. Verify the outside-group fixture and observe `UNTRUSTED_ISSUER` even though
   its signature and content binding pass.
4. Verify the tampered fixture and observe the integrity failure and displayed
   content difference even though its publisher is trusted.
5. Audit the malicious fixture and inspect GPT-5.6's structured behavioral
   findings and recorded model, provider, timestamp, and asset hash.

Supported installation platforms are macOS and Linux with Node.js 20 or newer
and OpenSSL. Full install and CLI instructions are in `docs/JUDGE_GUIDE.md`.
