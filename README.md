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

## What does Free2PA do?

Free2PA is a **load gate for agent control files**. You put it between the
files that steer an agent and the code that loads those files.

For example, suppose your application loads `SOUL.md`, `SKILL.md`, or a tool
configuration into an agent. Free2PA gives your application one decision
before it does that:

```text
control file + signed sidecar + this group's public certificates
                              |
                              v
                  PASS / LOAD or FAIL / REJECT
```

The workflow is:

1. A publisher signs a control file. Free2PA writes a neighboring
   `.c2pa.json` sidecar containing its signed provenance receipt.
2. The group operator places that publisher's **public certificate** in the
   verifier's trust directory.
3. Before an agent loads the file, the host calls Free2PA through the CLI, MCP,
   or HTTP API.
4. Free2PA checks the signature, the exact file bytes, certificate dates, and
   membership in this verifier's local trust group.
5. The host loads only a `PASS` result. On `FAIL`, it can stop, repair from the
   signed original, alert and continue, or log according to its own policy.

Free2PA does not monitor a folder in the background and it does not alter the
agent framework. The developer adds the verification call at the point where
the application reads a critical file. The included Codex skill can locate
that point and wire the check into an existing agent application.

## See it protect a real Hello World agent

The live demo runs the same small Azure-hosted LLM through two application
lanes. Its signed `SOUL.md` permits only a greeting in the form
`Hello, <optimistic adjective> world!`.

- With the trusted soul, the protected agent starts and returns an optimistic
  greeting.
- After the soul is changed to require a bitter adjective, the unprotected
  agent follows it. Free2PA detects that the bytes no longer match the signed
  receipt and does not call the model under the default Block policy.
- Under Repair + report, Free2PA recovers the hash-verified original from the
  valid receipt, runs the agent with that optimistic soul, and reports the
  rejected change.
- A valid soul signed by a publisher outside the demo's temporary trust group
  is rejected before the model is called.

The changed file is evidence of a change, not evidence of a particular cause.
It could result from an attack, an engineer's mistake, or an agent rewriting
its own Nerve Center after a misunderstanding. Free2PA does not guess. It
establishes the two provenance facts at the heart of C2PA: who originated the
file, and whether the signed bytes were edited. The local verifier then decides
whether that origin and edit history is acceptable for its temporary trust
group.

Try it without an account at
<https://free2pa-buildweek.azurewebsites.net>. The repository example uses the
operator's own OpenAI or Azure OpenAI account:

```bash
npm run demo:hello -- trusted
npm run demo:hello -- changed
npm run demo:hello -- changed repair
```

The cryptographic Free2PA toolkit still requires no LLM. The model is part of
this example application, not part of the trust decision.

## How do I set it up?

### Fastest path: let Codex implement it

Install the toolkit and its implementation skill:

```bash
git clone https://github.com/kilroyblockchain/free2pa-devtool.git
cd free2pa-devtool
npm install
npm link
free2pa codex-skill install
```

Then open the agent application's repository in Codex and ask:

```text
Use $free2pa-protect-agent. First fact-gather this application's entry point,
Nerve Center files, and load boundaries. Show me the Free2PA fact sheet. Then
implement a fail-closed Free2PA gate using .free2pa/trusted-publishers, and
prove trusted, changed, and outside-group behavior.
```

Codex first reports what it found. After the publisher list and failure policy
are established, it installs the pinned release, creates the project layout,
wires the gate into the real loader or startup path, and adds the three boundary
tests. It must not guess who belongs to the trust group or silently sign edits.

See [Implementation runbook](docs/IMPLEMENTATION_RUNBOOK.md) for the exact
download-to-done workflow and completion criteria.

### Manual path

This example protects an existing `SOUL.md`. Substitute the path to any text
file your agent loads.

**1. Install Free2PA**

Prerequisites: macOS or Linux, Node.js 20 or newer, and OpenSSL on `PATH`.

```bash
git clone https://github.com/kilroyblockchain/free2pa-devtool.git
cd free2pa-devtool
npm install
npm link
free2pa --version
```

Before configuring anything, run the included examples to see the contract:

```bash
# Unchanged file from a publisher in this demo's trust group: exits 0
free2pa verify public/demo/trusted/SKILL.md --trust-store demo_certs

# File changed after signing: exits nonzero and reports CONTENT_CHANGED
free2pa verify public/demo/tampered/SKILL.md --trust-store demo_certs
```

The first command prints `PASS`; the second prints `FAIL`. That same exit-code
decision is what an agent startup hook or file loader consumes programmatically.

**2. Create a publisher identity**

The private key signs files. Keep it private. The public certificate is what
you give to groups that should trust your files.

```bash
free2pa keygen \
  --name "My Project Publisher" \
  --id my-project \
  --days 30 \
  --out-dir .free2pa
```

**3. Admit that publisher to this project's trust group**

```bash
free2pa trust add .free2pa/my-project.crt \
  --store .free2pa/trusted-publishers \
  --id my-project
```

Each developer or deployment controls its own `trusted-publishers` directory.
To trust a teammate, add their public `.crt` file to the same directory. Never
add their private key.

**4. Sign the file**

```bash
free2pa sign ./path/to/SOUL.md \
  --cert .free2pa/my-project.crt \
  --key .free2pa/my-project.key \
  --purpose "Agent identity and behavior instructions"
```

This creates `./path/to/SOUL.md.c2pa.json` beside the file. Commit the control
file and sidecar. Do not commit `.free2pa/my-project.key`.

**5. Gate the agent's load operation**

Run this immediately before the application reads `SOUL.md`:

```bash
free2pa verify ./path/to/SOUL.md \
  --trust-store .free2pa/trusted-publishers \
  --json
```

Exit code `0` means the host may load the file. A nonzero exit means it must
apply its failure policy. The JSON result explains whether the signature,
file-integrity, certificate, or group-trust check failed.

For an agent-native integration, launch the local verifier:

```bash
free2pa serve \
  --trust-store .free2pa/trusted-publishers \
  --skills ./path/to \
  --port 4001
```

The application can now call the `verify_asset` MCP tool at
`http://127.0.0.1:4001/mcp` with the exact file and sidecar bytes. Consume its
structured `decision`: load on `LOAD`; apply the configured failure policy on
`REJECT`.

### Which integration tool should I use?

| Application shape | Free2PA tool | Where it runs |
|---|---|---|
| Custom Node harness | `loadVerifiedFile()` from `free2pa/load-gate` | In the loader, immediately before content enters model context |
| OpenClaw or another harness with a controllable start command | `free2pa verify` or `free2pa scan` | In a fail-closed preflight wrapper before the harness starts |
| Framework with an MCP client or shared verifier | `free2pa serve` plus `verify_asset` | At each protected file-load boundary; continue only on `LOAD` |
| Pull requests and releases | Free2PA GitHub Action | In CI, before changed agent controls can merge |
| Optional behavioral review | `free2pa audit` with an operator-installed LLM provider | After provenance verification; never as a replacement for it |

For a custom Node loader, the gate is one import:

```js
import { loadVerifiedFile } from 'free2pa/load-gate';

const systemInstructions = await loadVerifiedFile({
  assetPath: 'agent/SOUL.md',
  trustStore: '.free2pa/trusted-publishers',
});

startAgent({ systemInstructions });
```

`loadVerifiedFile` returns the content only when every check passes. Otherwise
it throws `Free2PALoadError` before the harness receives the untrusted text.

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

Free2PA's signing, verification, trust, repair, and load-gate features are
model-independent and run without ChatGPT or an OpenAI API. An optional
GPT-5.6 audit can review what a skill asks an agent to do. The model can
identify behavioral risks, but it cannot override a failed cryptographic check.

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

## CLI reference

Run `free2pa --help` to see the complete command surface. The setup workflow
above uses `keygen`, `trust add`, `sign`, and `verify`; the remaining sections
show shared verifiers, audits, scanning, CI, MCP, and HTTP integration.

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

## Optional LLM security auditors

The Free2PA core requires no LLM account. A verifier operator may bring an
OpenAI, Azure OpenAI, OpenAI-compatible, local, or other account for independent
behavioral review. Check the current state with:

```bash
free2pa auditor status
```

For direct OpenAI use, provide your own server-side account credential:

```bash
export OPENAI_API_KEY="..."
free2pa audit ./skills/weather/SKILL.md --model gpt-5.6
```

The server also supports Azure OpenAI v1 through `AZURE_OPENAI_ENDPOINT` and
`AZURE_OPENAI_DEPLOYMENT`. Local operators may provide
`AZURE_OPENAI_API_KEY`; Azure App Service can instead use a system-assigned
managed identity with the `Cognitive Services OpenAI User` role. The hosted
judge demo uses managed identity and stores no model credential.

Other LLM integrations are installable auditor modules. Install the adapter in
the Free2PA project, set `FREE2PA_AUDITOR_MODULE` and any account variables its
provider requires, then run the same `free2pa audit` command. See
[optional auditor providers](docs/AUDITOR_PROVIDERS.md) for the module contract
and security boundary.

The audit returns strict structured findings covering:

- prompt injection;
- secret or credential access;
- data exfiltration;
- destructive actions;
- excessive permissions;
- unsafe downloads and supply-chain behavior; and
- obfuscated instructions.

The built-in OpenAI provider presents skill content as delimited, untrusted
data. Every provider report records the model, audit time, filename, and SHA-256
of the reviewed content. Files larger than 64 KiB are rejected. `critical` and
`high` reports produce a nonzero CLI exit code.

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
      - uses: kilroyblockchain/free2pa-devtool@v0.4.0
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
| `verify_asset` | Verify any Nerve Center file plus sidecar and return structured `PASS`/`FAIL` and `LOAD`/`REJECT`. |
| `list_skills` | List skills visible to this verifier and whether each has a sidecar. |
| `verify_skill` | Verify one of the server's bundled demo skills by folder name. |
| `audit_skill` | Ask the configured optional LLM provider for an independent behavioral security review. |

The host calls `verify_asset` with the exact file bytes and neighboring
sidecar before placing the file into agent or model context. It consumes the
structured `decision` directly: `LOAD` means every deterministic gate passed;
`REJECT` includes separate signature, file-integrity, certificate-currentness,
and publisher-trust facts plus a stable reason code. A high-risk Nerve Center
can treat anything other than `LOAD` as unavailable; other applications may
repair, alert and continue, or log according to their explicit response
policy. `verify_skill` and `list_skills` remain convenient for the bundled
research fixtures.

## HTTP API

| Endpoint | Purpose |
|---|---|
| `POST /api/sign` | Sign a skill and return its sidecar. |
| `POST /api/verify` | Verify a skill and sidecar against this server's trust store. |
| `POST /api/audit` | Run the configured optional LLM behavioral audit. |
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

Free2PA `0.4.0` is **C2PA-inspired, not a conforming C2PA implementation**. It
uses sidecar files to carry C2PA-style provenance credentials in a Free2PA
format, not a C2PA Manifest Store, and does not claim interoperability with
conforming C2PA products. Like C2PA, its provenance claim is specifically about
origin and edits: a signed publisher identity traces origin, while asset binding
reveals whether the signed bytes changed. Free2PA then addresses an adjacent
local-policy question for an agentic nerve center: which publishers does this
temporary group choose to trust? It is not a replacement for C2PA conformance.

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
- An LLM audit is probabilistic security analysis, not proof of safety.

## License

Apache License 2.0. Free to use, inspect, modify, and redistribute under the
terms in [`LICENSE`](LICENSE).
