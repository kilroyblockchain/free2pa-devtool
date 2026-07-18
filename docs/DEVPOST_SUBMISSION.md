# Devpost Submission Draft

## Project name

Free2PA

## Tagline

Agent frameworks put developers in the driver's seat. Free2PA is the seat belt
for the files that steer the agent.

## Category

Developer Tools

## Inspiration

Karen Kilroy co-chairs the C2PA AI/ML Task Force. She developed the original Free2PA
research demo in response to a practical need she observed among college
students collaborating through OpenClaw agentic nerve centers: they needed
publisher trust groups that could form quickly around a project and end when
the collaboration ended.

Karen calls the collection of skills and critical agent-control files the
**Nerve Center**. It can include files such as `SKILL.md` and `SOUL.md` that
shape what an agent can do. A file may be changed by an external attack, by
someone outside the trust group, or by the agent itself. In every case, the
operational question is the same: does this exact file still have provenance
the local group accepts?

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

Free2PA puts a signed receipt beside the files that tell an AI agent who it is
and what it can do. Before the agent uses one, Free2PA checks two facts anyone
can understand: has this file changed, and did it come from someone this group
trusts?

Free2PA signs AI agent skill files with ECDSA P-256 credentials and binds each
credential to the exact file content with SHA-256. A verifier checks:

1. whether the credential signature is valid;
2. whether the skill is unchanged; and
3. whether the publisher belongs to that verifier's local trust group.

The trust store is the policy. Adding a public certificate admits a publisher.
Removing it revokes trust on the next verification without modifying any
credential. Trust can be one-way, team-wide, class-wide, or deliberately
short-lived.

No human has to inspect every receipt. Verification happens programmatically
when an agent starts, loads a skill, or accepts a changed control file. Free2PA
returns machine-readable facts; the host application can block or quarantine,
alert and continue, log the event, or restore a known trusted version. The
`repair` command restores only content embedded in a valid, current, locally
trusted signed receipt and preserves the rejected file for reporting. Critical Nerve Center files should
normally fail closed, but enforcement remains an application policy rather
than a hidden decision inside Free2PA.

Free2PA places that decision at the Nerve Center's admission boundary. The
sidecar preserves the signed publisher and asset hash. If a protected file
changes, even when an agent rewrites its own `SOUL.md`, the integrity gate
fails and the implementation can quarantine the file instead of loading it.
This release demonstrates the pattern with `SKILL.md`; the same exact-byte
binding applies to other text-based control files.

GPT-5.6 adds an independent structured behavioral audit for prompt injection,
secret access, data exfiltration, destructive actions, unsafe downloads,
supply-chain behavior, and excessive permissions. Cryptographic verification
remains the hard gate; the model cannot turn a failed credential into a pass.

Developers can use Free2PA through an installable CLI, browser interface, HTTP
API, or Streamable HTTP MCP server. JSON output and nonzero exit codes support
CI and agent-policy enforcement.

The repository also includes a Codex skill for retrofitting Free2PA into an
existing OpenClaw project, ChatGPT app, MCP server, or other agentic system. A
developer can ask Codex to identify the application's Nerve Center, install the
pinned freeware release, place verification before the load boundary, and
prove that both changed files and publishers outside the project group are
rejected. The developer still owns every trust and signing decision.
The packaged CLI installs the skill with `free2pa codex-skill install`.

The Azure page is a reference verifier and judge sandbox, not a centralized
Free2PA service. The repository is the product: each developer decides where
the verifier runs, which public certificates define that deployment's trust
group, and which interface fits the surrounding agent system.

## How we built it

The implementation uses Node.js 20, Express, the Model Context Protocol SDK,
OpenSSL, Node's native cryptography and X.509 APIs, and the OpenAI Responses API
with a strict JSON schema for GPT-5.6 audits. The public Azure deployment calls
GPT-5.6 Sol through a scoped managed identity, so no model API key is stored.

The same verification core is composed into several developer-facing surfaces
rather than being tied to the demo UI: terminal commands for local workflows,
structured output for automation, a reusable CI action, HTTP endpoints for
applications, and MCP tools for agents.

The signing envelope contains a canonical JSON claim, SHA-256 content binding,
an embedded X.509 public certificate, and an ES256 signature. Verifiers enforce
the declared algorithm, current certificate validity, signature correctness,
content integrity, and local certificate membership. Trust results include
machine-readable reason codes such as `LOCAL_TRUST`, `EXPLICIT_MATCH`,
`UNTRUSTED_ISSUER`, and `EXPIRED_CERT`.

## How we used Codex and GPT-5.6

Karen Kilroy supplied the central product concept and made the key trust-policy and
scope decisions. Codex audited three related research repositories, helped
select the focused agent-skill baseline, implemented the distributable CLI and
verifier workflow, added tests and security hardening, reviewed dependency and
browser risks, and prepared reproducible release and judging materials.

Codex accelerated implementation but did not define the trust model. During
development, Karen rejected an unnecessary signed group-policy layer and
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
old work as new. The public repository identifies sanitized commit `cd5c2c3` as
the content-equivalent pre-event baseline and documents every submitted Build
Week extension separately.

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

C2PA has a formal conformance program in which conforming Content Credentials
are verified by conforming verifiers. Free2PA `0.3.0` is C2PA-inspired but is
not a conforming C2PA implementation. It uses sidecar files to carry C2PA-style
provenance credentials in a Free2PA format: a signed publisher identity traces
origin and asset binding reveals edits. It then addresses an adjacent concern
at an agentic nerve center: which publishers a local, temporary group chooses
to trust. Free2PA does not replace or claim interoperability with C2PA
conformance. Karen's task-force role provided domain context; this submission
does not claim C2PA endorsement.

## Submission links

- Repository: https://github.com/kilroyblockchain/free2pa-devtool
- Freeware release: https://github.com/kilroyblockchain/free2pa-devtool/releases/tag/v0.3.0
- Live demo: https://free2pa-buildweek.azurewebsites.net
- Backup demo video: https://github.com/kilroyblockchain/free2pa-devtool/releases/download/v0.3.0/Free2PA-Build-Week-demo.mp4
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

## YouTube upload

Title:

> Free2PA: Ad-Hoc Trust Groups for AI Agent Skills | OpenAI Build Week

Description:

> Free2PA is an Apache-2.0 developer tool for launching an ad-hoc verifier and
> choosing which AI agent-skill publishers a group trusts. It combines
> deterministic signature, content-integrity, certificate-validity, and local
> trust gates with an independent GPT-5.6 behavioral security audit.
>
> Live demo: https://free2pa-buildweek.azurewebsites.net
>
> Source: https://github.com/kilroyblockchain/free2pa-devtool

Upload `artifacts/Free2PA-Build-Week-final.mp4` as a public video. It is 2:45.5,
1920x1080 H.264/AAC, has Azure Neural HD English narration, no music, and
normalized speech at approximately -16.6 LUFS.

## Gallery assets

- Cover: `artifacts/Free2PA-cover.png`
- Trust-boundary proof: `artifacts/Free2PA-trust-boundary.png`
- GPT-5.6 audit proof: `artifacts/Free2PA-gpt-audit.png`
