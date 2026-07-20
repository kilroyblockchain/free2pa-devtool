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
shape what an agent can do. A file may be changed by an external attack, an
engineering mistake, someone outside the trust group, or the agent itself
acting on a misunderstanding. In every case, Free2PA establishes the two
provenance facts at the heart of C2PA: who originated this file, and whether its
signed bytes were edited. The local verifier then decides whether that origin
and edit history is acceptable for its temporary trust group. Free2PA detects
the change without guessing its cause.

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
The live judge demo makes that boundary concrete with a real Azure-hosted Hello
World agent. Its trusted `SOUL.md` permits only
`Hello, <optimistic adjective> world!`. A changed soul instead asks for bitter
adjectives. The comparison lane passes that changed soul to the model and shows
the bitter response. Under the protected Block policy, Free2PA quarantines the
changed soul and the model is never called. Under Repair + report, Free2PA
recovers the hash-verified signed optimistic soul, runs the model with that
version, and reports the rejected change. A valid soul from outside the local
group is stopped before inference as well.

Free2PA's signing, verification, trust, repair, and load-gate features are
model-independent and run without ChatGPT or an OpenAI API. A verifier operator
may optionally add their own LLM account for behavioral review. OpenAI, Azure
OpenAI, and OpenAI-compatible accounts are supported directly; other local or
hosted LLMs can be installed as auditor modules through a documented provider
contract. The configured provider reviews prompt injection, secret access, data
exfiltration, destructive actions, unsafe downloads, supply-chain behavior,
and excessive permissions. Cryptographic verification remains the hard gate;
an LLM can never turn a failed credential into a pass.

Developers can use Free2PA through an installable CLI, browser interface, HTTP
API, or Streamable HTTP MCP server. The generic MCP `verify_asset` tool accepts
any Nerve Center file and sidecar, then returns structured `PASS`/`FAIL`,
`LOAD`/`REJECT`, four independent gate results, and a stable reason code. JSON
output and nonzero exit codes support CI and agent-policy enforcement.

The repository also includes a Codex skill for retrofitting Free2PA into an
existing OpenClaw project, ChatGPT app, MCP server, or other agentic system. A
developer can ask Codex to fact-gather the real entry point, Nerve Center,
load boundary, and existing security checks before editing. Codex reports the
facts and unknown owner decisions, then installs the pinned freeware release,
places verification before the load boundary, and proves that both changed
files and publishers outside the project group are rejected. The developer
still owns every trust and signing decision. The packaged CLI installs the
skill with `free2pa codex-skill install`.

Custom Node harnesses can import `loadVerifiedFile()` from
`free2pa/load-gate`. It returns content only after every deterministic check
passes and throws before rejected text reaches the agent. Fixed loaders can use
a fail-closed CLI preflight, while MCP-capable frameworks can call
`verify_asset`. The implementation runbook identifies which tool runs at every
stage from download through runtime enforcement and CI.

The Azure page is a reference verifier and judge sandbox, not a centralized
Free2PA service. The repository is the product: each developer decides where
the verifier runs, which public certificates define that deployment's trust
group, and which interface fits the surrounding agent system.

## Why it matters

Agent developers are the primary audience. A single changed instruction in a
high-leverage control file can alter every later action an agent takes, yet
asking people to review sidecars or hashes by hand does not scale. Free2PA
makes provenance an automatic load-time control that can be added to an
existing ChatGPT app, MCP server, OpenClaw project, or agent framework without
requiring a permanent central authority.

The distinctive behavior is verifier-local trust. The same authentic,
unchanged file can pass for the temporary group that admitted its publisher
and fail everywhere else. That makes the boundary useful for classes, small
teams, open-source collaborations, and short engagements where the members and
their trust relationships change faster than a durable public PKI.

The result is practical defense in depth: deterministic checks decide whether
the file may load, the host chooses what happens on failure, and GPT-5.6 can
separately explain behavioral risk. Developers get tamper evidence and policy
enforcement; users do not acquire another security chore.

## How we built it

The implementation uses Node.js 20, Express, the Model Context Protocol SDK,
OpenSSL, Node's native cryptography and X.509 APIs, and the OpenAI Responses API
with a strict JSON schema for GPT-5.6 audits. The public Azure deployment calls
GPT-5.6 Sol through a scoped managed identity, so no model API key is stored.

The same verification core is composed into several developer-facing surfaces
rather than being tied to the demo UI: terminal commands for local workflows,
structured output for automation, a framework-neutral Node load-gate API, a
reusable CI action, HTTP endpoints for applications, and MCP tools for agents.

The signing envelope contains a canonical JSON claim, SHA-256 content binding,
an embedded X.509 public certificate, and an ES256 signature. Verifiers enforce
the declared algorithm, current certificate validity, signature correctness,
content integrity, and local certificate membership. Trust results include
machine-readable reason codes such as `LOCAL_TRUST`, `EXPLICIT_MATCH`,
`UNTRUSTED_ISSUER`, and `EXPIRED_CERT`.

## How we used Codex and GPT-5.6

Karen Kilroy supplied the central product concept and made the key trust-policy
and scope decisions. Codex audited three related research repositories, helped
select the focused agent-skill baseline, implemented the distributable CLI and
verifier workflow, built the load-gate API, added tests and security hardening,
reviewed dependency and browser risks, and prepared the fact-gathering skill,
implementation runbook, reproducible release, and judging materials.

Codex accelerated implementation but did not define the trust model. During
development, Karen rejected an unnecessary signed group-policy layer and
restated the simpler invariant that now anchors the product: the verifier is
where trust lives.

GPT-5.6 was used during Build Week and is the optional auditor configured on the
judge deployment. It evaluates a skill's behavioral risk as untrusted input and
returns structured evidence, impact, and remediation. Other operators bring
their own account or install another provider. The core Free2PA trust gate does
not depend on a model.

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

- Live two-lane Agentic Factory comparing the same control file with and
  without programmatic Free2PA verification.
- Explicit Block, Repair-and-report, Alert-and-continue, and Log host policies.
- Guarded `repair` command that restores a trusted signed original while
  preserving the rejected file as evidence.
- Installable `free2pa-protect-agent` Codex skill with a one-command installer.
- Fact-gather-first integration workflow that traces the target harness before
  changing its loader or trust policy.
- `free2pa/load-gate` API that returns only verified content to custom Node
  harnesses and throws before rejected text reaches the agent.
- Download-to-done implementation runbook for custom, fixed-loader, MCP, and
  CI integrations.
- Complete ad-hoc verifier lifecycle from the command line.
- Outside-group rejection, certificate admission, and immediate revocation.
- Tamper detection with a human-readable diff.
- GPT-5.6 structured audits through CLI, HTTP, browser, and MCP.
- Optional auditor-provider contract for operator-supplied OpenAI, Azure
  OpenAI, OpenAI-compatible, local, or other LLM accounts.
- Generic MCP load gate for arbitrary Nerve Center files, not only bundled
  server fixtures.
- Reusable GitHub Action for pull-request trust enforcement and JSON evidence.
- Eighteen automated tests covering signing, trust, tampering, CLI behavior,
  load-gate safety, and API contracts.
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
- Additional version-specific convenience adapters built on the generic load
  gate for popular agent frameworks.
- Publisher discovery URLs and certificate fingerprint confirmation.
- Versioned supersession and provenance-completeness assertions.

## C2PA disclosure

C2PA has a formal conformance program in which conforming Content Credentials
are verified by conforming verifiers. Free2PA `0.4.0` is C2PA-inspired but is
not a conforming C2PA implementation. It uses sidecar files to carry C2PA-style
provenance credentials in a Free2PA format: a signed publisher identity traces
origin and asset binding reveals edits. It then addresses an adjacent concern
at an agentic nerve center: which publishers a local, temporary group chooses
to trust. Free2PA does not replace or claim interoperability with C2PA
conformance. Karen's task-force role provided domain context; this submission
does not claim C2PA endorsement.

## Submission links

- Repository: https://github.com/kilroyblockchain/free2pa-devtool
- Freeware release: https://github.com/kilroyblockchain/free2pa-devtool/releases/tag/v0.4.0
- Live demo: https://free2pa-buildweek.azurewebsites.net
- Backup demo video: https://github.com/kilroyblockchain/free2pa-devtool/releases/download/v0.4.0/Free2PA-Build-Week-v0.4.0.mp4
- YouTube demo: https://youtu.be/utuJHUSHp_c
- Primary Codex `/feedback` Session ID: `019f72ea-75e0-7670-8c90-48602c610d24`

## Judge testing instructions

No account, rebuild, API key, or payment is required.

1. Open the live Agentic Factory. Leave **Changed** and **Block** selected and
   choose **Say hello**. The real Azure model in the unchecked lane follows the
   altered bitter `SOUL.md`. Free2PA returns `CONTENT_CHANGED`, quarantines the
   file, and skips the protected model call.
2. Select **Repair + report** and say hello again. Observe the unchecked bitter
   greeting beside `RESTORE + RUN + REPORT` and a protected optimistic greeting
   generated from the hash-verified signed soul.
3. Run **Outside group** and observe that signature and file checks pass while
   group trust fails with `UNTRUSTED_ISSUER`; the protected agent does not start.
4. Run **Trusted** and observe that all checks pass and both model calls produce
   optimistic greetings.
5. Open **Research workbench**, use **Demo files** to load the behavioral-risk
   fixture, and inspect GPT-5.6's structured audit and model metadata.

Supported installation platforms are macOS and Linux with Node.js 20 or newer
and OpenSSL. Full install and CLI instructions are in `docs/JUDGE_GUIDE.md`.

## Devpost custom answers

These IDs match the live OpenAI Build Week submission form fetched on July 19,
2026. The first two answers require Karen's explicit legal confirmation before
submission.

### 27945 - Submitter Type

`Individual` - pending Karen's confirmation.

### 27946 - Country of Residence

`United States` - pending Karen's confirmation.

### 27947 - Category

`Developer Tools`

### 27948 - Code repository

https://github.com/kilroyblockchain/free2pa-devtool

### 27949 - Judge sandbox and instructions

> Live sandbox: https://free2pa-buildweek.azurewebsites.net
>
> No account, API key, payment, rebuild, or credentials are required. On the
> Agentic Factory, run Changed with Block and say hello. The real Azure model
> in the unchecked lane follows the altered bitter SOUL.md; Free2PA reports
> CONTENT_CHANGED, quarantines it, and skips the protected model call. Select
> Repair + report to see the same model produce an optimistic greeting from the
> hash-verified signed soul. Outside group rejects a valid, unchanged soul as
> UNTRUSTED_ISSUER. Trusted passes every gate. Research workbench provides the
> optional GPT-5.6 behavioral audit configured on this judge deployment.

### 27950 - Primary Codex session

`019f72ea-75e0-7670-8c90-48602c610d24`

### 27951 - Developer-tool installation and testing

> Platforms: macOS and Linux with Node.js 20+ and OpenSSL on PATH. Clone
> https://github.com/kilroyblockchain/free2pa-devtool, run `npm install`,
> `npm link`, and `free2pa --version`. The exact freeware package is also at
> https://github.com/kilroyblockchain/free2pa-devtool/releases/tag/v0.4.0.
> Run the included trusted and tampered fixtures using the commands at the top
> of README.md, or run `npm run check` for all 18 tests. Custom Node harnesses
> import `loadVerifiedFile` from `free2pa/load-gate`; fixed loaders use a
> fail-closed CLI preflight; MCP-capable frameworks call `verify_asset` and
> continue only on `LOAD`. Install the Codex implementer with
> `free2pa codex-skill install`. Core Free2PA requires no LLM account. Optional
> auditors use the operator's own account or an installed provider module. The
> included Hello World example uses the operator's own OpenAI or Azure OpenAI
> account. The full suite currently contains 20 tests.

## YouTube upload

Title:

> Free2PA Agentic Factory: A Seat Belt for Agent Control Files | OpenAI Build Week

Description:

> Agent frameworks put developers in the driver's seat. Free2PA is the seat
> belt for the files that steer the agent. This Apache-2.0 developer toolkit
> adds signed receipts, exact-file integrity, and project-local publisher trust
> to an agentic Nerve Center. The host consumes PASS or FAIL programmatically
> and can block, repair and report, alert and continue, or log. Free2PA also
> ships an installable Codex skill and an independent GPT-5.6 behavioral audit.
>
> Live demo: https://free2pa-buildweek.azurewebsites.net
>
> Source: https://github.com/kilroyblockchain/free2pa-devtool

The public video is https://youtu.be/utuJHUSHp_c. The uploaded master is 2:56.2,
1920x1080 H.264/AAC, has Azure Neural HD English narration, no music, and
normalized speech at approximately -16.7 dB mean volume. The source decoded
without error and contains no unexplained audio dropouts. YouTube's public
rendition was independently checked with 1080p video and 48 kHz audio available.

## Gallery assets

The final set contains fifteen 1800x1200 images. It moves from product identity
through real verifier outcomes, enforcement policy, the trust model, MCP and
Codex integrations, GPT-5.6, and the Build Week provenance disclosure.

- Exact gallery ZIP: https://github.com/kilroyblockchain/free2pa-devtool/releases/download/v0.4.0/Free2PA-Devpost-Gallery-v0.4.0.zip
- Contact sheet: https://github.com/kilroyblockchain/free2pa-devtool/releases/download/v0.4.0/contact-sheet.png
- Refined logo: https://github.com/kilroyblockchain/free2pa-devtool/releases/download/v0.4.0/Free2PA-logo.png
- Upload order and captions: `docs/COLLATERAL.md`
- Gallery ZIP SHA-256: `f645d53e2b67219bf4c92b8aa8ec487dd32af0eb5ffba2ce50a97e152f8b3786`
