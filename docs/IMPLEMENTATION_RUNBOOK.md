# Free2PA Implementation Runbook

This is the download-to-done path for adding Free2PA to an existing agentic
application. The goal is a programmatic gate that stops unverified control text
before it enters agent or model context.

## Tool map

| Phase | Tool | What it does | Output |
|---|---|---|---|
| Discover | Codex with `$free2pa-protect-agent` | Inspects the real repository and traces control-file reads | Free2PA fact sheet with file-path evidence |
| Install | `npm` | Installs the pinned Free2PA toolkit | `free2pa` CLI and `free2pa/load-gate` API |
| Identify | `free2pa keygen` | Creates a time-bounded publisher identity | Private `.key` plus shareable public `.crt` |
| Admit | `free2pa trust add` | Adds a public certificate to this verifier's group | Project-local trusted-publisher directory |
| Bind | `free2pa sign` | Signs reviewed file bytes | Neighboring `.c2pa.json` signed receipt |
| Gate | Load-gate API, CLI, or MCP | Verifies immediately before load | `LOAD` or `REJECT` plus reason code |
| Enforce | Host policy | Blocks, repairs, alerts, or logs | Deterministic application behavior |
| Prove | Existing test runner plus Free2PA fixtures | Exercises three trust-boundary cases | Trusted loads; changed and outsider reject |
| Prevent | GitHub Action | Repeats verification on pull requests | Merge blocked on failed provenance |
| Review | `free2pa audit` and GPT-5.6, optional | Reviews behavioral risk in trusted text | Structured risk findings, never a trust override |

## 1. Install the implementation skill

Run once on the developer workstation:

```bash
git clone https://github.com/kilroyblockchain/free2pa-devtool.git
cd free2pa-devtool
npm install
npm link
free2pa codex-skill install
```

Open the target agent repository in Codex and invoke
`$free2pa-protect-agent`. The skill must inspect before editing.

**Done when:** `free2pa --version` prints `0.3.2`, and the skill exists at
`$CODEX_HOME/skills/free2pa-protect-agent`.

## 2. Establish the facts

Codex traces the target application's actual startup and file-loading paths. It
reports:

- agent entry point and start command;
- candidate Nerve Center files;
- the function, hook, or process that reads each file;
- existing integrity, policy, and failure handling;
- best available integration surface; and
- facts that require an owner decision.

No package installation, key generation, signing, or loader edit happens during
this phase.

**Owner decisions:** approve the protected file list, name allowed publishers,
and choose block, repair, alert-and-continue, or log-only behavior. Use block by
default for identity, permissions, tools, and system instructions.

**Done when:** every protected file has an identified pre-load boundary and the
trust group and failure policy are explicit.

## 3. Install Free2PA in the target application

For a Node repository, pin the release artifact:

```bash
npm install --save-dev \
  https://github.com/kilroyblockchain/free2pa-devtool/releases/download/v0.3.2/free2pa-0.3.2.tgz
```

For another language, keep the Node CLI as a startup or build prerequisite. Do
not reimplement the cryptography in the application's language during setup.

**Done when:** `npx free2pa --version` succeeds in the target repository.

## 4. Create the project trust group

Generate the first publisher identity in a private directory:

```bash
npx free2pa keygen \
  --name "Project Publisher" \
  --id project-publisher \
  --days 90 \
  --out-dir .free2pa/publisher-private
```

Add `.free2pa/publisher-private/` to `.gitignore`. Admit only the public
certificate:

```bash
npx free2pa trust add \
  .free2pa/publisher-private/project-publisher.crt \
  --store .free2pa/trusted-publishers \
  --id project-publisher
```

Add another group member by importing their public `.crt` file with the same
`trust add` command. Remove one with `trust remove`.

**Done when:** `npx free2pa trust list --store .free2pa/trusted-publishers`
shows exactly the publishers the owner approved, and no private key is tracked.

## 5. Sign reviewed Nerve Center files

Review each file before signing it:

```bash
npx free2pa sign agent/SOUL.md \
  --cert .free2pa/publisher-private/project-publisher.crt \
  --key .free2pa/publisher-private/project-publisher.key \
  --purpose "Agent identity and behavior policy"
```

Commit the file and its neighboring `agent/SOUL.md.c2pa.json`. Repeat for the
approved Nerve Center list. Do not automatically re-sign a file merely because
an agent or outside process changed it.

**Done when:** every protected file has a sidecar and passes `free2pa verify`
against the project trust directory.

## 6. Wire the load boundary

Choose one route based on facts, not product labels.

### Custom Node harness

Use the API in the function that currently reads the control file:

```js
import { loadVerifiedFile } from 'free2pa/load-gate';

const instructions = await loadVerifiedFile({
  assetPath: 'agent/SOUL.md',
  trustStore: '.free2pa/trusted-publishers',
});

startAgent({ systemInstructions: instructions });
```

The function returns verified content or throws `Free2PALoadError`. Do not read
the file a second time after verification.

### OpenClaw or a harness with a fixed loader

Codex first discovers the installed version's real start command and supported
hooks. If the loader cannot be intercepted safely, create a preflight wrapper:

```bash
set -euo pipefail
npx free2pa verify agent/SOUL.md --trust-store .free2pa/trusted-publishers
npx free2pa scan skills --trust-store .free2pa/trusted-publishers
exec <the repository's existing agent start command>
```

Point the service manager or package start script at the wrapper. Do not claim
that a framework has a particular hook or filename until repository or official
version-specific documentation confirms it.

### Framework with MCP support

Run a project-local or shared verifier:

```bash
npx free2pa serve \
  --trust-store .free2pa/trusted-publishers \
  --skills ./skills \
  --port 4001
```

At the framework's file-load hook, call `verify_asset` at
`http://127.0.0.1:4001/mcp` with the exact file and sidecar text. Put content
into model context only when `structuredContent.decision` is `LOAD`. Network
failure, malformed output, and `REJECT` all follow the configured failure policy.

**Done when:** there is exactly one verified read path and no protected content
can reach the agent through an earlier unverified read.

## 7. Prove the boundary

Add automated tests using copies of a real protected fixture:

1. Approved publisher, unchanged file returns `LOAD`.
2. Change one byte after signing; startup rejects `CONTENT_CHANGED`.
3. Sign unchanged content with an unadmitted identity; startup rejects
   `UNTRUSTED_ISSUER`.

Also test a missing sidecar and an unavailable verifier. Both must follow the
chosen failure policy. Restore test fixtures after the test; never re-sign the
tampered copy.

**Done when:** the repository's normal test command proves all cases and the
real start command succeeds only with the trusted fixture.

## 8. Keep it enforced

Add the Free2PA GitHub Action to pull requests and store only public
certificates in version control. Document publisher admission and removal.
Optionally run `free2pa audit` after deterministic verification to review what
trusted instructions ask the agent to do.

**Implementation is done when:** installation is reproducible, the trust group
is explicit, protected files and sidecars are tracked, private keys are not,
the runtime verifies before reading, all three boundary tests pass, and CI
prevents an unverified change from merging.
