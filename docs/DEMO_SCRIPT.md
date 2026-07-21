# Free2PA Demo Script

Goal: under three minutes, no vocabulary tax, no research preamble.

Core line:

> Free2PA stops changed or outside-publisher agent control files before they
> load.

## 0:00-0:20 — The problem

Visual: landing page hero and three scenario buttons.

Narration:

> AI agents read plain-text files that act like code: system prompts, skills,
> tools, and policy. If one of those files changes, the agent changes with it.
> Free2PA is a developer load gate for those files.

## 0:20-0:55 — Changed instructions

Visual: select **Changed**, policy **Block**, click **Run file**.

Narration:

> Here the same changed instruction file goes through two lanes. The
> unprotected lane reads the file directly, so the changed instructions reach
> the agent. The protected lane calls the live Free2PA verifier before loading
> the text.

## 0:55-1:20 — The hard gate

Visual: focus on signature/hash/trust checks and `QUARANTINE`.

Narration:

> The signature is valid and the publisher is trusted, but the file hash no
> longer matches the signed receipt. Free2PA returns `REJECT` with
> `CONTENT_CHANGED`, and the host quarantines the file before model context.

## 1:20-1:45 — Outside publisher

Visual: select **Outside group**, click **Run file**.

Narration:

> A valid signature is not enough. This file is authentic and unchanged, but it
> came from a publisher this project never admitted. Local trust fails, so the
> verifier returns `UNTRUSTED_ISSUER`.

## 1:45-2:10 — Trusted file and repair

Visual: select **Trusted**, then briefly show **Repair + report** on Changed.

Narration:

> When the file is unchanged and the publisher is in this project's trust
> store, Free2PA returns `LOAD`. For changed files with a valid trusted receipt,
> the host can also restore the signed original and preserve the rejected file
> as evidence.

## 2:10-2:35 — Developer integration

Visual: show README integration snippet.

Narration:

> Developers can add the gate where the app already reads instructions. In
> Node, `loadVerifiedFile()` returns content only after every check passes. The
> same core also ships as a CLI, HTTP API, MCP `verify_asset` tool, and GitHub
> Action.

## 2:35-2:50 — Codex and GPT-5.6

Visual: show Codex skill command and optional audit note.

Narration:

> The included Codex skill finds the real load boundary in an existing agent
> app and adds tests for trusted, changed, and outside-publisher cases. GPT-5.6
> is used separately for optional behavioral audit; it never overrides the
> deterministic trust gate.

## 2:50-3:00 — Close

Visual: final `LOAD | REJECT` frame.

Narration:

> Your project. Your trust store. No global registry. Agent control files load
> only when this verifier says they may.

## Recording checklist

- [ ] First 20 seconds state the developer problem.
- [ ] Changed-file block is the primary demo.
- [ ] Outside-publisher rejection is shown as the unique trust-model point.
- [ ] CLI / Node / MCP / CI are evidence, not separate storylines.
- [ ] GPT-5.6 is described as optional behavioral review, not the hard gate.
- [ ] C2PA relationship is documented in README/Devpost, not over-explained in
      the live demo.
