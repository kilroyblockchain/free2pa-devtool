# Free2PA Video Script v2

Target length: 2:30 to 2:45.

Required Devpost constraint: public YouTube video under 3 minutes. Audio must
explain the project and how Codex and GPT-5.6 were used.

## Core line

Free2PA is tamper detection for agent control files before they enter model
context.

## 0:00-0:12 — Problem

Visual:

- Free2PA hero.
- Highlight `SOUL.md`, `AGENTS.md`, `SKILL.md`, `TOOLS.md`.

Narration:

> AI agents load plain text files that act like code: prompts, skills, tools,
> policies, and files like SOUL.md or AGENTS.md. If one of those files changes,
> the agent can change before the model call even starts.

## 0:12-0:24 — Product

Visual:

- Hello World app phone on the left.
- Free2PA verify console phone on the right.
- Button: Say Hello.

Narration:

> Free2PA puts a signed receipt beside each control file and verifies it at the
> load boundary. The host asks one question: may this exact file enter model
> context?

## 0:24-0:47 — Clean load

Visual:

- Click Say Hello.
- Verification console plays checks one by one.
- Signature pass.
- File matches receipt pass.
- Publisher trusted pass.
- Result: LOAD.
- Hello World app displays `Hello, <positive adjective> world!`

Narration:

> In this tiny Hello World agent, the app wants to load SOUL.md. Free2PA checks
> the receipt signature, the file hash, the certificate, and this verifier's
> local trusted-publisher group. When all checks pass, Free2PA returns LOAD and
> the verified instructions reach the model.

## 0:47-1:17 — Unsigned edit

Visual:

- Open editor on verify console.
- Change the rule from `Never` to `Always`.
- Save.
- Show note: file changed after signature; new signature required.

Narration:

> Now we edit the control file. This is the kind of change that can happen from
> a human mistake, a dependency, an extension, or an agent trying to rewrite its
> own instructions. Saving the file does not approve it. A local saved revision
> stays pending until a trusted publisher signs it.

## 1:17-1:45 — Repair policy

Visual:

- Click Say Hello again.
- Console shows hash mismatch.
- Result: RESTORE + RUN + REPORT.
- App still answers with a positive greeting.
- Console shows rejected edit and fallback to last signed file.

Narration:

> On the next run, the signature and publisher can still be valid, but the file
> hash no longer matches the signed receipt. Free2PA rejects the changed bytes.
> With repair policy, the host restores the signed original embedded in the
> trusted receipt, reports the rejected edit, and runs the last verified version
> instead of loading unsigned text.

## 1:45-2:02 — Sign new revision

Visual:

- Click Sign It.
- Show new receipt.
- Run again.
- Result: LOAD for the newly signed revision.

Narration:

> If this edit is intentional, the local Free2PA console signs a new receipt.
> Only then does the changed file become the approved version. Trust lives in
> this verifier, not in a global registry.

## 2:02-2:24 — Developer install

Visual:

- Install page.
- `npm install`.
- `loadVerifiedFile()` snippet.
- CLI/MCP/CI surface cards.

Narration:

> Developers add Free2PA where their app already reads control files. In Node,
> loadVerifiedFile returns content only after every deterministic check passes.
> The same core ships as a CLI, HTTP API, MCP verify_asset tool, GitHub Action,
> and installable Codex skill.

## 2:24-2:43 — Codex and GPT-5.6

Visual:

- Codex skill command.
- Optional GPT-5.6 audit note.
- LLM brief link.

Narration:

> Codex helped turn the research prototype into this shippable developer tool:
> CLI, load gate, MCP, tests, packaging, demo, and docs. Free2PA also includes
> a Codex skill that can retrofit the gate into an existing agent app. GPT-5.6
> is used separately for optional behavioral audit. It can explain risky
> instructions, but it never overrides the cryptographic load gate.

## 2:43-2:52 — Close

Visual:

- Final frame: `LOAD before context`.
- Links: live demo and repo.

Narration:

> Free2PA gives agent developers a simple boundary: signed, trusted control
> files load. Changed or untrusted files do not.

## On-screen text checklist

- Tamper detection for agent control files.
- Verify before model context.
- Signature: PASS.
- File matches receipt: PASS / FAIL.
- Publisher trusted: PASS.
- LOAD.
- RESTORE + RUN + REPORT.
- New signature required.
- Node load gate, CLI, HTTP, MCP, CI, Codex skill.
- GPT-5.6 audit is optional and separate.
