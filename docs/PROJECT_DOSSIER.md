# Free2PA Build Week Project Dossier

Status date: July 18, 2026  
Competition: OpenAI Build Week  
Track: Developer Tools  
Official deadline: July 21, 2026 at 5:00 PM Pacific / 7:00 PM Central  
Entrant and product lead: Karen Kilroy  
Implementation partner: Codex, primary session `019f72ea-75e0-7670-8c90-48602c610d24`

## Executive brief

Free2PA is an Apache-2.0 developer toolkit that makes the files steering an AI
agent tamper-evident for a local, temporary trust group.

Agent frameworks put developers in the driver's seat. Free2PA is the seat belt
for the files that steer the agent.

Karen calls the collection of skills and critical control files the agent's
**Nerve Center**. It may include `SOUL.md`, `AGENTS.md`, `SKILL.md`, prompts,
policies, MCP manifests, tool definitions, and configuration. These files can
change because of an attack, a contributor outside the accepted group, or the
agent itself. Free2PA answers two deterministic questions before the host
loads a protected file:

1. Is this the exact file the publisher signed?
2. Does this verifier's local group trust that publisher now?

The host consumes the result in code. A person does not inspect receipts or
watch a dashboard. The application chooses a response policy such as block,
repair and report, alert and continue, or log.

## Product thesis

### Problem

High-leverage agent instructions are commonly stored as editable text. A
single changed instruction can redirect every later action, but ordinary file
sharing does not preserve an explicit, machine-enforced answer about origin,
integrity, and project-local publisher trust.

### Insight

People form temporary trust groups constantly: a class for a semester, a team
for a project, two collaborators for an assignment, or a contractor for an
engagement. These groups need a verifier they control, not necessarily a
permanent public identity or global registry.

### Product promise

Put a signed receipt beside every critical control file. At load time, verify
signature, exact-file integrity, certificate validity, and membership in the
verifier's local trust group. Return a machine decision before the file enters
agent or model context.

### What is novel

Trust belongs to the verifier. The same authentic, unchanged file can pass in
the temporary group that admitted its publisher and fail everywhere else.
Removing the public certificate ends trust on the next check without changing
or revoking the signed receipt itself.

## Primary audience

- Developers building ChatGPT applications and MCP servers.
- Agent-framework and OpenClaw developers protecting project control files.
- Teams that exchange agent skills or prompts across short-lived projects.
- Security and DevOps engineers adding provenance gates to startup and CI.
- Educators and student groups collaborating through agentic Nerve Centers.

## What ships

| Surface | Job |
|---|---|
| CLI | Key generation, signing, verification, guarded repair, recursive scanning, trust membership, GPT-5.6 audit, and local server startup. |
| MCP server | Agent-native shared verifier using Streamable HTTP at `POST /mcp`. |
| `verify_asset` MCP tool | Generic structured load gate for any Nerve Center file and sidecar. |
| HTTP API | Application integration for signing, verification, audit, and trust-store management. |
| GitHub Action | Pull-request enforcement with a JSON evidence artifact and fail-closed exit. |
| Codex skill | One-command installation of the workflow for retrofitting an existing agent application. |
| Agentic Factory | Live two-lane demonstration showing the same file with and without enforcement. |
| Research workbench | Sign, verify, diff, and independent GPT-5.6 behavioral-audit sandbox. |
| Freeware package | Apache-2.0 npm archive with private keys excluded. |

Supported platforms are macOS and Linux with Node.js 20 or newer and OpenSSL.

## Why MCP is central

Free2PA should be an MCP server, but MCP is one interface rather than the trust
model itself.

The primary MCP tool is `verify_asset`. Deterministic host code sends the exact
file text and neighboring sidecar to the verifier. The tool returns:

- `verdict`: `PASS` or `FAIL`;
- `decision`: `LOAD` or `REJECT`;
- `signature_valid`;
- `file_unchanged`;
- `certificate_current`;
- `publisher_trusted`;
- a stable `reason_code`; and
- publisher subject and certificate fingerprint.

The MCP tool is read-only, idempotent, and bounded. The model may explain a
failure, but it cannot convert `REJECT` into `LOAD`. CLI and HTTP remain
important because startup hooks and CI must be able to enforce the same rule
without involving a model.

## Runtime architecture

```text
Publisher reviews Nerve Center file
        |
        v
Free2PA signs exact bytes with ECDSA P-256
        |
        +-- control file
        +-- neighboring .c2pa.json signed receipt

Agent host is about to load the file
        |
        v
CLI / MCP verify_asset / HTTP / CI
        |
        +-- signature valid?
        +-- SHA-256 exact-file match?
        +-- certificate current?
        +-- certificate in this verifier's trust store?
        |
        +-- all pass ------> LOAD
        |
        +-- any fail ------> REJECT + reason code
                                |
                                +-- block or quarantine
                                +-- guarded repair + report
                                +-- alert + continue
                                +-- log only
```

The verifier supplies facts. The surrounding application owns response
policy. Critical bootstrap files should normally fail closed.

## Trust and threat model

### Protected cases

- One or more bytes change after signing.
- A valid file arrives from a publisher outside the local group.
- A signing certificate is expired or not yet valid.
- A signature, claim, certificate, or sidecar is malformed.
- An agent rewrites its own `SOUL.md` or another protected control file.
- A pull request introduces unsigned, changed, or outside-group skills.

### Guarded repair

`free2pa repair` restores only original content embedded in a receipt whose
signature is valid, certificate is current, and publisher is locally trusted.
It verifies the embedded content against the signed hash and preserves the
rejected file as evidence by default. It refuses repair for an outside-group
publisher or invalid credential.

### Explicit non-goals

- Free2PA does not prove that signed instructions are benevolent.
- Free2PA does not let GPT-5.6 override cryptographic failure.
- Free2PA is not a global identity registry or permanent public PKI.
- Free2PA is not a conforming or interoperable C2PA implementation.
- Free2PA does not silently re-sign files changed by an agent.

## GPT-5.6's role

Cryptography proves provenance, integrity, certificate status, and local
publisher trust. GPT-5.6 separately evaluates behavioral risk such as prompt
injection, secret access, exfiltration, destructive actions, unsafe downloads,
supply-chain behavior, and excessive permissions.

The running product uses the OpenAI Responses API with a strict JSON schema.
The Azure deployment uses a scoped managed identity rather than a stored model
key. Model, provider, audit time, and asset hash are recorded. GPT-5.6 remains
an independent assessment and cannot turn a failed trust gate into a pass.

## C2PA relationship

Karen Kilroy co-chairs the C2PA AI/ML Task Force. That role supplied domain
context; it does not imply C2PA endorsement.

C2PA has a formal conformance program in which conforming Content Credentials
are verified by conforming verifiers. Free2PA is C2PA-inspired but uses its own
sidecar format to carry C2PA-style provenance credentials. Like C2PA, its
provenance claim is about origin and edits: a signed publisher identity traces
origin and exact-byte binding reveals whether the signed bytes changed. Free2PA
then addresses an adjacent agentic question: which publishers does this local,
temporary verifier trust?

## Research baseline and Build Week scope

The research demo was created for a presentation to the University of Arkansas
AI Club before the competition. The private development repository identifies
commit `1c2d88d` as the March 15, 2026 baseline. The sanitized public repository
identifies content-equivalent commit `cd5c2c3` as its baseline.

Build Week transformed that research demo into a distributable developer tool:

- installable CLI and clean freeware package;
- explicit certificate-currentness and local-trust gates;
- recursive scanning and reusable GitHub Action;
- independent GPT-5.6 audit through CLI, HTTP, browser, and MCP;
- scoped Azure deployment with managed identity and rate limits;
- Agentic Factory product demo;
- block, repair, alert, and log policy demonstrations;
- guarded repair implementation;
- installable Codex integration skill;
- generic structured MCP `verify_asset` load gate;
- automated security, trust, tamper, CLI, API, MCP, and package tests;
- judge guide, submission narrative, gallery, release, and final video.

## Judging strategy

### Technological implementation

Evidence:

- Four separate deterministic gates rather than one opaque score.
- CLI, HTTP, MCP, CI, browser, and Codex integration share one verification core.
- Generic MCP tool has declared input/output schemas and machine decisions.
- Guarded recovery verifies the embedded original and preserves evidence.
- GPT-5.6 uses structured output and remains outside the hard gate.
- Public CI, clean archive installation, automated tests, and zero known npm
  advisories at the last successful audit.

### Design

Evidence:

- Agentic Factory compares one control file in protected and unprotected lanes.
- Trusted, changed, and outside-group cases are visible without uploads or setup.
- Response policy is an explicit control rather than a hidden product decision.
- Mobile and desktop layouts have been captured and reviewed.
- Judges can test without an account, rebuild, API key, or payment.

### Potential impact

Evidence:

- Protects high-leverage files used by ChatGPT apps, MCP servers, OpenClaw, and
  other agent frameworks.
- Adds provenance to existing projects without requiring a central authority.
- Eliminates manual receipt inspection through programmatic load-time decisions.
- Supports temporary groups common in education, contracting, and open source.

### Quality of the idea

Evidence:

- Verifier-local, non-transitive, revocable group membership is distinct from
  generic signing and permanent public trust systems.
- The same valid credential intentionally passes one group's verifier and fails
  another.
- Provenance and behavioral analysis are complementary but never conflated.

## Demonstration story

The final video is 2 minutes 51.4 seconds, 1920x1080 H.264/AAC, with English
Azure Neural HD narration, no music, and approximately -16.8 LUFS audio.

1. Define the Nerve Center and seat-belt promise.
2. Run the same changed file through unprotected and protected lanes.
3. Show automatic quarantine and then guarded repair and reporting.
4. Show an authentic outside-group publisher rejected by local policy.
5. Show the trusted publisher pass.
6. Show Codex installing the gate into an existing agent application.
7. Explain CLI, HTTP, MCP, and CI machine-readable decisions.
8. Separate GPT-5.6 behavioral analysis from cryptographic trust.
9. Distinguish the pre-event research demo from Build Week product work.

## Current evidence

| Item | State | Evidence |
|---|---|---|
| Core toolkit | Complete | Public source and Apache-2.0 license. |
| Automated suite | Passing | 21 tests, including protected model-call suppression, guarded repair, generic MCP cases, and the toolkit-first product hierarchy. |
| MCP HTTP transport | Passing locally | Live Streamable HTTP client returns `LOAD`, `CONTENT_CHANGED`, and `UNTRUSTED_ISSUER` as expected. |
| Public CI | Green on the `v0.4.1` release commit | GitHub Actions run `29739052381` verifies public commit `6d0c195`. |
| Azure demo | Healthy on `0.4.1` | Generic Agentic Factory is primary; managed-identity Hello World is a separate reference integration; production MCP passes all three verdicts. |
| Freeware release | Public `v0.4.1` | Package, load-gate API, fact-gathering Codex skill, reference agent, signed fixtures, runbook, video, gallery, and checksums are attached to public commit `6d0c195`. |
| Final video file | Complete | `artifacts/Free2PA-Build-Week-v0.4.1.mp4`; 2:55.7, 1080p, continuous normalized narration. |
| Devpost registration | Complete | Authenticated account is already registered for OpenAI Build Week. |
| Devpost project | Draft populated | Project `free2pa`, ID `1346166`; toolkit-first write-up, links, technologies, logo, new public video, and revised 15-image gallery are saved. |
| YouTube | Public and verified | `https://youtu.be/ENMRlkhARVQ`; 2:55.7 master, generic trust-gate thumbnail, public oEmbed, 1080p video, and separate audio streams available. |
| Final Devpost submission | Pending | Requires entrant assertions, custom fields, and final submit action. |

## Public links

- Live demo: <https://free2pa.org>
- Public repository: <https://github.com/kilroyblockchain/free2pa-devtool>
- Freeware release: <https://github.com/kilroyblockchain/free2pa-devtool/releases/tag/v0.4.1>
- Devpost project: <https://devpost.com/software/free2pa>
- Public YouTube video: <https://youtu.be/ENMRlkhARVQ>
- Backup video: <https://github.com/kilroyblockchain/free2pa-devtool/releases/download/v0.4.1/Free2PA-Build-Week-v0.4.1.mp4>

## Devpost field packet

| Field | Prepared value |
|---|---|
| Project | Free2PA |
| Tagline | The seat belt for the files that steer AI agents. |
| Category | Developer Tools |
| Repository | `https://github.com/kilroyblockchain/free2pa-devtool` |
| Judge demo | `https://free2pa.org` |
| Session ID | `019f72ea-75e0-7670-8c90-48602c610d24` |
| Video | `https://youtu.be/ENMRlkhARVQ` |
| Submitter type | Karen must confirm Individual, Team of Individuals, or Organization. |
| Country | Karen must confirm the country entered as the legal residence. |
| Ownership and eligibility | Karen must make the final legal assertions. |

The full project narrative and judge instructions live in
`docs/DEVPOST_SUBMISSION.md` and `docs/JUDGE_GUIDE.md`.

## Execution plan

### July 18: finish the product surface

- [x] Finish the generic MCP implementation and documentation.
- [x] Run the full suite, real Streamable HTTP test, dependency audit, package
  inspection, and diff checks.
- [x] Commit to the private development repository and sanitized public repository.
- [x] Publish a release containing the generic MCP tool and exact checksums.
- [x] Deploy the same commit to Azure and test all three MCP verdicts in production.
- [x] Update the Devpost write-up with the final MCP capability.

### July 18-19: finish media and submission draft

- [x] Upload the final MP4 to Karen's authenticated YouTube channel.
- [x] Set title, description, audience, custom thumbnail, and public visibility.
- [x] Wait for HD processing, check the processed audio, and confirm 1080p availability.
- [x] Add the YouTube URL to the Devpost project.
- [x] Design, render, and independently inspect fifteen 3:2 submission images.
- [x] Publish the exact gallery set, contact sheet, refined logo, and checksums
  on the public v0.4.1 release.
- [x] Replace the Devpost gallery thumbnail with the refined identity frame.
- [x] Attach the fifteen images to the Devpost project in their documented order.
- [ ] Populate every Devpost custom answer and save the complete draft.

### July 19: submit with buffer

- [ ] Karen confirms submitter type, country, eligibility, ownership, and any
  team representation.
- [ ] Submit Free2PA to OpenAI Build Week in Developer Tools.
- [ ] Record the final public submission URL and timestamp.

### July 19-20: independent final audit

- [ ] Test Azure, repository, release, package, video, gallery, and submission
  while logged out.
- [ ] Clean-install the release on a fresh temporary directory.
- [ ] Verify the release checksum and run all tests from exact release contents.
- [ ] Run trusted, changed, and outside-group cases through production MCP.
- [ ] Freeze judge-facing claims after they match the submitted build.

### July 21: contingency only

Use the final day only for availability or submission-platform recovery. Do not
plan feature development or first submission work against the official
5:00 PM Pacific deadline.

## Risk register

| Risk | Consequence | Mitigation |
|---|---|---|
| YouTube upload or HD processing delay | Required deliverable unavailable | Upload on July 18-19; retain public GitHub backup; verify audio after processing. |
| Last-minute MCP addition diverges from package or Azure | Judge claims do not match build | Release and deploy one exact commit; test tool schemas and three verdicts through production. |
| Trust language is mistaken for C2PA conformance | Credibility and eligibility concern | Keep explicit non-conformance disclosure in README, Devpost, video, and dossier. |
| Model appears to make trust decisions | Weak security story | Show deterministic gate first; GPT-5.6 remains an independent behavioral audit. |
| Judges see only a hosted demo | Toolkit impact is obscured | Lead with installable CLI, MCP, CI, Codex skill, clean release, and judge guide. |
| Project appears pre-existing | Only old work receives credit | Preserve baseline commits and enumerate Build Week additions with dated evidence. |
| Repair is perceived as silently blessing changes | Security concern | Preserve rejected copy; restore only hash-verified content from a current, trusted signed receipt. |
| Legal entrant fields are guessed | Submission may be invalid | Karen personally confirms submitter type, residence, eligibility, ownership, and representation. |

## Key decisions already made

- The verifier is where trust lives; there is no unnecessary signed group-policy layer.
- Trust is local, explicit, non-transitive, and revocable by certificate removal.
- Humans select trusted publishers; software performs routine verification.
- Signature, integrity, certificate status, and local trust remain separate facts.
- GPT-5.6 explains behavioral risk but never overrides the hard gate.
- MCP is the primary agent-native interface, not the only integration surface.
- The hosted Azure page is a judge sandbox, not a centralized Free2PA service.
- The project is freeware under Apache-2.0.

## Definition of done

The Build Week entry is complete only when all of the following are proven:

- The exact public source, release archive, and Azure deployment contain the
  same judge-visible capabilities.
- A clean installation succeeds and the full automated suite passes.
- Production demonstrates trusted `LOAD`, changed-file `REJECT`, and
  outside-group `REJECT` through the generic MCP tool.
- The public YouTube video is under three minutes, audible throughout, readable
  at 1080p, and matches the deployed build.
- The Devpost entry contains the category, repository, live demo, video,
  session ID, installation instructions, supported platforms, and testing path.
- Karen has confirmed the required legal and entrant assertions.
- The project is submitted before the deadline and its final URLs work while
  logged out.
