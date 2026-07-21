# Free2PA Toolkit-First Revision Plan

**Prepared for:** Karen Kilroy  
**Purpose:** Correct the OpenAI Build Week presentation so Free2PA is clearly
the product and Hello World is clearly one implementation example.  
**Status:** Approved, implemented, tested, and published. Final submission still
requires Karen's legal confirmations and explicit authorization.

---

## 1. The correction

The latest presentation moved too far toward the Hello World agent. That agent
was meant to prove that Free2PA can protect a real application boundary. It was
not meant to redefine Free2PA as a Hello World product.

The corrected hierarchy is:

1. **Free2PA is the product.**
2. **The product is a developer toolkit for ad-hoc publisher trust verification
   and provenance enforcement around AI agent Nerve Center files.**
3. **The Agentic Factory is the primary live demonstration of the toolkit's
   general contract.**
4. **Hello World is one small reference integration showing that contract inside
   a real LLM application.**
5. **GPT-5.6 behavioral auditing is an optional extension and Build Week proof,
   not part of the cryptographic trust decision.**

This hierarchy must be consistent in the live application, video, Devpost page,
gallery, README, judge guide, and release materials.

---

## 2. Product definition

### One-sentence definition

> Free2PA is an Apache-2.0 developer toolkit that verifies the origin and edit
> state of AI agent Nerve Center files against an ad-hoc, verifier-local
> publisher trust group before an application loads them.

### The problem

Agentic applications consume high-leverage files such as:

- `SOUL.md` and identity instructions;
- `SKILL.md` and agent skills;
- tool definitions and MCP configuration;
- system prompts and policy files;
- permission manifests; and
- other files that determine what an agent can do.

Those files can change after review because of an attack, an engineering
mistake, a supply-chain event, someone outside the intended group, or an
agent's own modification. Free2PA does not claim to identify the cause or judge
whether the new content is good. It establishes provenance facts before load.

### The provenance contract

Free2PA answers the C2PA-aligned questions:

1. Who originated this file?
2. Have the signed bytes been edited?

The local verifier then answers the deployment-specific question:

3. Does this verifier currently accept that publisher?

The result is machine-readable `PASS`/`FAIL` and `LOAD`/`REJECT`, with
individual signature, file-integrity, certificate, and publisher-trust facts.

### The enforcement boundary

Free2PA does not silently decide application policy. The surrounding host uses
the verification result to:

- block or quarantine;
- repair from a valid, current, locally trusted signed original and report;
- alert and continue by explicit policy; or
- log for observation.

Critical Nerve Center files should normally fail closed.

### The trust model

Trust lives in each verifier. A project admits publishers by adding their
public certificates to that verifier's local trust store. Removing a
certificate ends that trust on the next check.

This creates explicit, flat, non-transitive, revocable trust groups that can
form for a class, team, contractor engagement, open-source project, or other
temporary collaboration without a permanent central registry.

---

## 3. Product surfaces

The presentation must show that Free2PA is a complete toolkit, not a single
demo page.

| Surface | Role |
|---|---|
| CLI | Identity creation, signing, trust admission/revocation, verification, scanning, repair, and JSON output |
| Node load gate | Returns file content only after every required provenance gate passes |
| HTTP API | Adds verification to custom application harnesses |
| MCP server | Lets MCP-capable agent systems call a generic `verify_asset` tool |
| GitHub Action | Enforces verification in pull requests and emits evidence |
| Codex skill | Fact-gathers an existing agent and installs Free2PA at its real load boundary |
| Browser sandbox | Lets judges inspect the contract without an account or rebuild |
| Optional auditor | Uses an operator-installed LLM provider after provenance verification |

The repository and release are the product. The Azure deployment is a judge
sandbox and reference verifier, not a centralized Free2PA service.

---

## 4. Role of the Hello World agent

Hello World will remain in the project because it is a useful, understandable
proof of integration.

It will be described as:

> A minimal reference application showing where a developer places the
> Free2PA load gate before an LLM consumes `SOUL.md`.

It proves three implementation details:

1. A failed file can be blocked before the protected model call occurs.
2. Guarded repair can supply only the hash-verified signed original to the
   protected model.
3. A valid file from a publisher outside this verifier's trust group can be
   rejected before model context.

It does **not** define the scope of Free2PA. It is one example alongside the
CLI, MCP, HTTP, CI, load-gate, and Codex integration surfaces.

---

## 5. Live application revision

### Primary page: `/`

The root page will return to a toolkit-first **Agentic Factory**.

The first viewport will show:

- Free2PA identity and the literal developer-tool offer;
- a general Nerve Center file rack containing `SKILL.md`, `SOUL.md`, and
  `TOOL.md` examples;
- an unprotected lane that loads a file without provenance checks;
- a protected lane that calls the real Free2PA verifier;
- signature, file, certificate, and group facts;
- the host's selected enforcement policy; and
- the resulting `LOAD`, `QUARANTINE`, `REJECT`, `RESTORE + REPORT`,
  `ALERT + CONTINUE`, or `LOG + CONTINUE` action.

This primary experience will remain model-independent. It will call the
deployed `/api/verify` endpoint and demonstrate the generic toolkit contract.

The page will also expose the developer surfaces without making the page a
marketing site:

- installable Codex skill;
- release installation command;
- CLI, HTTP, MCP, Node, and CI entry points; and
- direct links to the repository, release, judge guide, and reference example.

### Reference example: `/hello-world.html`

The current real LLM comparison will move to a separate page labeled
**Reference integration: Hello World agent**.

That page will explicitly say that it is one example of placing Free2PA before
an application's real file-load boundary. It will retain:

- trusted, changed, and outside-group cases;
- block, repair, alert, and log policies;
- real Azure-hosted GPT-5.6 output; and
- proof that the protected model call is skipped on a blocked failure.

### Research workbench: `/workbench.html`

The existing research workbench remains available as a deeper inspection
surface. It will not be presented as the main product experience.

### Navigation

The relationship will be explicit:

1. Toolkit Factory
2. Hello World Example
3. Research Workbench
4. Repository
5. Freeware Release

---

## 6. Video revision

The replacement video will remain under three minutes, but the toolkit will
own the majority of the runtime.

### Proposed storyboard

| Time | Subject | Purpose |
|---|---|---|
| 0:00-0:20 | Product and problem | Define Free2PA, the Nerve Center, origin, edits, and ad-hoc trust |
| 0:20-0:48 | Generic Agentic Factory | Show one file without verification and the same file through the load gate |
| 0:48-1:10 | Trust-group boundary | Show trusted, changed, and outside-group results without involving an LLM |
| 1:10-1:35 | Enforcement policies | Show block, guarded repair, alert, log, and machine-readable evidence |
| 1:35-2:05 | Developer toolkit | Show CLI, Node load gate, MCP, HTTP, CI, release package, and Codex skill |
| 2:05-2:28 | Hello World reference integration | Show changed `SOUL.md` blocked before the model and signed original repaired |
| 2:28-2:45 | Codex and GPT-5.6 | Explain Build Week implementation and optional behavioral audit |
| 2:45-2:58 | Research disclosure and close | Distinguish the earlier university demo and state the product promise |

### Video language rules

- Say “Free2PA” or “the toolkit” when describing the product.
- Say “the Hello World reference application” when describing that example.
- Do not use Hello World as the opening definition or closing identity.
- State that Free2PA's cryptographic core requires no LLM.
- State that GPT-5.6 was used to build the tool and powers optional examples.
- Preserve the C2PA non-conformance disclosure.
- Preserve Karen Kilroy's authorship and decision-making role.

### Proposed closing line

> Free2PA gives developers a programmable provenance gate for the files that
> steer agents: your group, your verifier, your trust decisions.

---

## 7. Gallery revision

The 15-image gallery will become toolkit-first again.

### Proposed order

1. Free2PA identity and literal developer-tool offer
2. The agent Nerve Center problem
3. Generic Agentic Factory overview
4. Trusted file produces `LOAD`
5. Changed file produces `QUARANTINE`
6. Outside publisher produces `REJECT`
7. Host enforcement policies
8. Guarded repair and evidence preservation
9. Verifier-local ad-hoc trust boundary
10. Signed sidecar and provenance gates
11. Generic MCP `verify_asset`
12. Installable Codex integration skill
13. CLI, Node, HTTP, MCP, CI, and browser surfaces
14. Hello World reference integration and optional GPT-5.6 audit
15. Research baseline, Build Week additions, and C2PA disclosure

Only one gallery frame will center Hello World. Other frames may mention it as
evidence but will not present it as the product.

---

## 8. Devpost revision

The Devpost story will lead with the toolkit and keep the reference application
in a short, clearly subordinate section.

### Section order

1. Inspiration
2. The Nerve Center problem
3. What Free2PA does
4. Ad-hoc verifier-local trust
5. Programmatic enforcement
6. Developer toolkit surfaces
7. Codex implementation skill
8. Hello World reference integration
9. Optional LLM auditing
10. How Codex and GPT-5.6 were used
11. Build Week additions versus prior research
12. C2PA relationship and non-conformance disclosure
13. Judge installation and testing links

### Relative emphasis

- At least two thirds of the description will explain the general developer
  tool, integration contract, and impact.
- Hello World will occupy one compact section.
- The live root URL will point judges first to the generic Agentic Factory.
- The Hello World URL will be offered as a second reference test.

---

## 9. Repository and release revision

The implementation already contains the correct general-purpose components.
The revision will change hierarchy and documentation without removing the real
Hello World integration.

Planned repository changes:

- keep all existing CLI, load-gate, MCP, HTTP, CI, trust, repair, and auditor
  code;
- keep `src/helloAgent.js` and its tests as a reference integration;
- make `public/index.html` the general toolkit factory;
- make `public/hello-world.html` the reference integration;
- update README headings so setup and toolkit surfaces precede the example;
- revise the judge guide and dossier to match the corrected hierarchy;
- add route and browser tests for both public pages;
- publish an updated release only if packaged files or versioned claims change;
  and
- retain the complete Apache-2.0 license and private-key exclusions.

---

## 10. Implementation phases

### Phase 1: Approve the story

- Karen reviews this document.
- Resolve any changes to product definition, terminology, and emphasis.
- Freeze the new video and gallery outlines before production work.

### Phase 2: Correct the product experience

- Finish the toolkit-first root page.
- Label and finish the separate Hello World reference page.
- Test desktop and mobile layouts.
- Verify all generic and example API paths.

### Phase 3: Correct written materials

- Rewrite Devpost in the approved hierarchy.
- Reorder README and judge instructions.
- Update the dossier and collateral guide.
- Check every C2PA, Free2PA, Codex, and GPT-5.6 statement for scope accuracy.

### Phase 4: Rebuild presentation media

- Capture the revised toolkit factory.
- Render the toolkit-first gallery.
- Produce a new under-three-minute video from the approved storyboard.
- Scan source and processed audio for dropouts.
- Verify the public YouTube rendition at 1080p with audio.

### Phase 5: Publish and audit

- Run the complete automated suite and dependency audit.
- Clean-install the public release in an empty directory.
- Deploy Azure and run desktop/mobile browser checks.
- Update Devpost video, gallery, description, and testing instructions.
- Verify Devpost logged out.
- Perform a final requirement-by-requirement submission audit.

### Phase 6: Submit

- Obtain Karen's explicit entrant, residence, eligibility, ownership, and
  submission authorization.
- Submit to the Developer Tools category.
- Verify the submitted state and preserve submission evidence.

---

## 11. Acceptance criteria

The revision is complete only when all of the following are true:

- A first-time viewer can describe Free2PA without mentioning Hello World.
- The root page demonstrates generic verification of multiple Nerve Center file
  types without requiring an LLM.
- Hello World is visibly labeled as a reference integration.
- The live experience proves trusted, changed, outside-group, and repair paths.
- The toolkit surfaces are visible and runnable or directly testable.
- The video spends most of its time on the general product and developer
  workflow.
- No more than one of the 15 primary gallery frames centers Hello World.
- Devpost describes the developer toolkit before the example application.
- README provides an unambiguous download-to-done integration path.
- Free2PA claims only origin, edit detection, certificate status, and local
  verifier acceptance.
- No text implies semantic safety, C2PA conformance, C2PA interoperability, or
  C2PA endorsement.
- Free2PA core operation remains model-independent.
- The optional auditor never changes the provenance verdict.
- The public repository, package, live site, video, gallery, and Devpost page
  agree on the same product definition.
- Automated tests, clean installation, public deployment, and logged-out links
  all pass.

---

## 12. Current work-in-progress state

Before Karen requested this planning pause, two local, uncommitted changes were
started:

1. The current Hello World page was copied to `public/hello-world.html`.
2. The first portion of `public/index.html` was changed back toward a generic
   Agentic Factory.

These changes have **not** been committed, pushed, deployed, or applied to
Devpost. They will remain local until this plan is approved or revised.

---

## 13. Decisions for Karen's review

Please review these proposed decisions in particular:

1. Free2PA, not Hello World, is the primary product identity.
2. The generic Agentic Factory is the root live experience.
3. Hello World remains available on a separate reference-integration page.
4. One gallery frame and roughly 20-25 seconds of the video center the Hello
   World example.
5. GPT-5.6 auditing remains optional and separate from provenance.
6. The repository and release remain the product; Azure remains a judge sandbox.
7. No revised public material is deployed before this plan is approved.
