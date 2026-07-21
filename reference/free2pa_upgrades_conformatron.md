# Free2PA Upgrades Conformatron

Conformatron is a fast-read upgrade brief that keeps Free2PA pointed straight at C2PA’s intent without dragging in the parts that do not serve small teams. Each idea links a C2PA precedent to a pragmatic Free2PA enhancement, sized for effort, impact, and risk.

## Upgrade radar

| # | Upgrade | Effort | Payoff | Theme |
|---|---|---|---|---|
| 1 | Active credential semantics | Low | Clearer lifecycle + revocation story | Signing lifecycle |
| 2 | Ingredient / dependency assertions | Medium | Honest provenance graphs | Trust graph |
| 3 | Free2PA action vocabulary | Medium | Enforceable workflows | Governance |
| 4 | Trust reason codes | Low | Human-friendly trust UX | Verification |
| 5 | Soft binding mode | High | Remote skill + registry support | Distribution |
| 6 | Transparency log hook | Medium | Anti-equivocation trail | Accountability |
| 7 | Provenance completeness signal | Low | Safe defaults, no over-claiming | Honesty |

> **Agent reality check:** OpenClaw-style deployments use *many* Markdown files (standard SKILL.md plus custom runbooks, tool manifests, vows, etc.). Every upgrade below assumes Free2PA treats “skill files” as a family of agent-shaping documents, not a single filename. The same signing, tracking, and policy hooks should apply across the whole bundle.

### OpenClaw bundle snapshot (RadioHead demo)

The story that closes the current Free2PA spec is built on the RadioHead OpenClaw deployment. That workspace (`~/zorro_kilroy/karenkilroy/public/free2pa/`) shows the *real* mix of Markdown surfaces an agent reads before acting:

| File | Class | Why it matters |
|---|---|---|
| `AGENTS.md` | Standard | Session primer: boot rituals, memory rules, safety rails. |
| `SOUL.md` | Standard | Persona + boundaries that define the agent’s tone and decisions. |
| `USER.md` | Standard | Canonical human context; leaks if unsigned. |
| `IDENTITY.md` | Standard | Job-specific overlay (RadioHead 🎸 in the story) that agents copy into comms. |
| `MEMORY.md` | Standard | Long-term diary; may contain sensitive data. |
| `HEARTBEAT.md` | Standard | Background checklist executed via cron/heartbeats. |
| `APPS.md` | Custom | Runbook for `/apps` microservices powering the deployment. |
| `workflow.md` | Custom | 10-step transcription SOP, including external service calls. |
| `tests.md` | Custom | Operator acceptance tests the agent can self-run. |
| `SOUL/USER/AGENTS` daily `memory/*.md` | Custom | Rolling transcripts of operations. |

Treating only `SKILL.md` as “the asset” leaves most of this surface unsigned. Every upgrade below is written with this broader bundle in mind so the story and the implementation stay aligned.

---

## 1. Active credential semantics

**C2PA precedent** — Only the *active* credential matters and assets may receive new manifests during their lifecycle.

**Free2PA addition** — Let a manifest explicitly supersede older ones so re-signing is an explicit act rather than an implicit overwrite.

```jsonc
"credential": {
  "id": "uuid-or-hash",
  "supersedes": ["prior-uuid-1", "prior-uuid-2"]
}
```

Even a single string works if you only need the last hop:

```jsonc
"supersedes": "<sha256 of previous sidecar>"
```

**Impact**
- Policy engines can say “trust the most recent cred signed by <issuer>”.
- Re-issuance and expiry flows become auditable without deleting history.
- Mirrors C2PA’s “active manifest” messaging so the vocabulary matches industry docs.

---

## 2. Ingredient / dependency assertions

**C2PA precedent** — Ingredients allow manifests to cite upstream inputs, each with their own credentials.

**Free2PA addition** — Publish a minimal dependency graph for skills, tooling, and datasets. Keep it optional but structured.

```jsonc
{
  "label": "org.free2pa.ingredients",
  "data": {
    "skills": [
      { "name": "transcription", "hash": "sha256:...", "credential": "transcription.md.c2pa.json" }
    ],
    "tools": [
      { "name": "ffmpeg", "version": "6.1" }
    ],
    "datasets": [
      { "name": "voices-v2", "hash": "sha256:..." }
    ]
  }
}
```

**Impact**
- Verifiers gain supply-chain context without cracking open the skill file.
- Allows “fail if dependency X is untrusted” style policies.
- Sets the stage for shared catalogs or registries later.

---

## 3. Free2PA action vocabulary

**C2PA precedent** — The spec defines `c2pa.created`, `c2pa.edited`, `c2pa.reviewed`, etc. Free2PA already emits `c2pa.created`.

**Free2PA addition** — Introduce a short Free2PA-specific action set to express workflow checkpoints (creation, review, approval, deprecation).

```jsonc
"actions": [
  { "action": "free2pa.created", "actor": "author-handle" },
  { "action": "free2pa.reviewed", "actor": "peer-tester" },
  { "action": "free2pa.approved", "actor": "security-team", "role": "org.security" },
  { "action": "free2pa.deprecated", "actor": "release-bot" }
]
```

**Impact**
- Lets verifiers enforce “must be reviewed/approved” policies beyond raw authorship.
- Provides timeline breadcrumbs to show how a skill cleared publishing gates.
- Aligns with C2PA’s idea of recording “facts about the history of the content” while staying skill-focused.

---

## 4. Trust reason codes

**C2PA precedent** — UX guidance stresses explaining *why* something is or is not trusted.

**Free2PA addition** — Return a structured trust verdict plus reason enums so logs, dashboards, or MCP responses can be human-readable.

```jsonc
"trust": {
  "trusted": true,
  "reason": "ORG_TRUST",
  "detail": "Matched Friends of Justin / jkilroy-team cert"
}
```

Suggested enums: `LOCAL_TRUST`, `ORG_TRUST`, `PUBLIC_TRUST`, `EXPLICIT_MATCH`, `UNTRUSTED_ISSUER`, `CHAIN_ERROR`, `EXPIRED_CERT`.

**Impact**
- Gives ops teams actionable logs (“failed because cert expired” beats `false`).
- Helps agent clients explain outcomes to users without bespoke logic.
- Makes the verifier output align with C2PA UX recommendations even before UI polish.

---

## 5. Soft binding (decoupled binding) mode

**C2PA precedent** — Soft Binding lets provenance live outside the asset for streaming or remote assets.

**Free2PA addition** — Since Free2PA already uses sidecars, add an optional locator so the verifier can fetch the asset if it is not co-located.

```jsonc
"asset": {
  "hash": "sha256:...",
  "locator": "mcp://skills/transcription@v2"
}
```

Verification flow:
1. Resolve the locator (HTTP, MCP, IPFS, etc.).
2. Download and hash the content.
3. Compare against the recorded hash.

**Impact**
- Unlocks remote skill registries, marketplaces, or signed toolkits.
- Makes Free2PA usable for streaming-like contexts where embedding is impossible.
- Keeps all the binding logic squarely in the manifest, mirroring the C2PA soft-binding mental model.

---

## 6. Transparency log hook

**C2PA precedent** — None directly, but transparency logs complement trust lists in broader supply-chain tooling.

**Free2PA addition** — Offer an optional publishing hook that records `{ sidecar_hash, cert_fingerprint, timestamp }` to a log (local file, HTTP append API, Rekor-style service later).

**Impact**
- Detects equivocation (issuing two manifests for the same skill/version).
- Gives teams tamper-evident audit trails without overhauling signing.
- Plays nicely with ad-hoc trust groups: everyone can publish to their shared log if they want extra assurance.

---

## 7. Provenance completeness signal

**C2PA precedent** — The spec repeatedly reminds readers that provenance may be partial.

**Free2PA addition** — Add a simple enum so manifests say whether they believe the provenance story is complete, partial, or unknown.

```jsonc
"provenance": {
  "completeness": "partial" // "complete" | "unknown"
}
```

**Impact**
- Protects downstream systems from over-trusting a manifest that intentionally omitted steps.
- Signals honesty in UX copy (“publisher marked this as partial provenance”).
- Costs almost nothing in bytes or implementation.

---

## What to postpone on purpose

Not every C2PA concept delivers value right now. Stay focused by **not** sprinting into:

- Full JUMBF + COSE payload structures.
- Embedded manifests inside binary media.
- Formal C2PA Trust List parsing.
- Media-specific assertions (image/video metadata).

Those belong to heavier ecosystems; Free2PA’s sweet spot is “skills + provenance + quick enforcement.” Conformatron keeps that scope sharp while still giving you a roadmap that matches the spec’s spirit.
