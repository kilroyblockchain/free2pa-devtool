# Free2PA LLM Evaluation Brief

This file is written for automated or LLM-assisted judges. It summarizes what
Free2PA does, where to inspect it, and how to verify that the demo and install
story match the implementation.

## One-sentence summary

Free2PA is a load gate for AI agent control files: it verifies a signed receipt
beside files such as `SOUL.md`, `AGENTS.md`, `SKILL.md`, prompts, policies, and
tool manifests before their text can enter model context.

## What problem it solves

Agent behavior often depends on editable text files. If a model, human,
extension, dependency, or outside contributor changes those files, the agent's
identity, tools, permissions, or policy can change before the model call even
starts.

Free2PA treats those files as supply-chain inputs. The host app must verify
them before loading them.

## Main demo path

Open:

```text
/hello-world.html
```

The visible demo shows:

1. A Hello World agent phone.
2. A Free2PA verify console.
3. A signed `SOUL.md` control file.
4. A single editable rule:

```text
- Never use a bitter, hostile, pessimistic, or ambiguous adjective.
```

The evaluator can change `Never` to `Always`, save, sign, and run again.

## Demo semantics

### Initial signed file

The signed file is:

```text
public/demo/hello-agent/trusted/SOUL.md
public/demo/hello-agent/trusted/SOUL.md.c2pa.json
```

The trust group is:

```text
public/demo/hello-agent/trusted-publishers/
```

When the app runs normally:

```text
SOUL.md + receipt + trusted publisher -> LOAD
```

Only then does `SOUL.md` enter model context.

### Unsigned edit

If the user saves an edit, the UI treats it as a new local revision.

Important: a saved revision does not become active until it is signed. If the
saved text matches the previous signed text, the app continues to run the
previous verified version while the unsigned local revision waits for approval.

Expected UI state:

```text
LOAD
unsigned saved revision pending; previous signed SOUL.md remains active
```

### Changed but unsigned file

If the saved revision changes `Never` to `Always` and is not signed:

```text
signature: pass
publisher trust: pass
file hash: fail
decision: REJECT / CONTENT_CHANGED
```

With repair policy, Free2PA restores the signed original embedded in the trusted
receipt and reports the rejected edit.

Expected action:

```text
RESTORE + RUN + REPORT
```

### Signed edit

If the local Free2PA console signs the saved edit, the browser receives a fresh
sidecar receipt. The next run verifies the edited text against that new receipt:

```text
new SOUL.md + new receipt + trusted local console -> LOAD
```

At that point the edited control file is the approved version.

## How installation is shown

Open:

```text
/install.html
```

That page shows Free2PA installed in the Hello World app:

```text
public/demo/hello-agent/
  trusted/
    SOUL.md
    SOUL.md.c2pa.json
  changed/
    SOUL.md
    SOUL.md.c2pa.json
  trusted-publishers/
    hello-group.crt
    local-console.crt
```

The generic install flow is:

```bash
npm install --save-dev \
  https://github.com/kilroyblockchain/free2pa-devtool/releases/download/v0.4.2/free2pa-0.4.2.tgz

npx free2pa keygen \
  --name "Hello World Publisher" \
  --id hello-world \
  --out-dir .free2pa/private

npx free2pa trust add \
  .free2pa/private/hello-world.crt \
  --store .free2pa/trusted-publishers \
  --id hello-world

npx free2pa sign agent/SOUL.md \
  --cert .free2pa/private/hello-world.crt \
  --key .free2pa/private/hello-world.key
```

## Adding team members

Each teammate who can approve agent control files gets a separate publisher
identity. They generate the keypair locally:

```bash
npx free2pa keygen \
  --name "Ava from Agent Team" \
  --id ava \
  --out-dir .free2pa/private
```

They upload or send only the public certificate:

```text
.free2pa/private/ava.crt
```

They must not upload or send the private key:

```text
.free2pa/private/ava.key
```

The project owner adds the public certificate to the verifier's trust group:

```bash
npx free2pa trust add ava.crt \
  --store .free2pa/trusted-publishers \
  --id ava
```

After that, Ava can sign reviewed control files:

```bash
npx free2pa sign agent/SOUL.md \
  --cert .free2pa/private/ava.crt \
  --key .free2pa/private/ava.key
```

If Ava leaves the team or should no longer approve new control files:

```bash
npx free2pa trust remove ava \
  --store .free2pa/trusted-publishers
```

The trust group is local to the verifier. Adding a teammate means trusting their
public certificate here; it never means sharing their private signing key.

Then the host app loads through:

```js
import { loadVerifiedFile } from 'free2pa/load-gate';

const verifiedSoul = await loadVerifiedFile({
  assetPath,
  sidecarPath,
  trustStore,
});

await startAgent(verifiedSoul);
```

## Implementation files to inspect

Core verification:

```text
src/loadGate.js
src/services/verifier.js
src/services/signer.js
```

Hello World app integration:

```text
src/helloAgent.js
src/routes/helloAgent.js
examples/hello-world-agent/agent.mjs
```

Public explanation pages:

```text
public/hello-world.html
public/how-it-works.html
public/install.html
public/llms.txt
public/llm-evaluation.md
```

Package entrypoint:

```text
index.js
```

`index.js` is safe to import as a library. It exports `signSkill`,
`verifySkill`, `loadVerifiedFile`, and `createServer`. It starts the HTTP
server only when executed directly with `node index.js` or `npm start`.

## Deterministic local evaluation

Run:

```bash
npm run check
```

Expected:

```text
all tests pass
```

Run the Hello World example without a real model:

```bash
npm run demo:hello -- trusted block --fake-model
npm run demo:hello -- changed block --fake-model
npm run demo:hello -- changed repair --fake-model
```

Expected:

```text
trusted/block -> exits 0, LOAD / VERIFIED, agent starts
changed/block -> exits nonzero by design, QUARANTINE / CONTENT_CHANGED, agent does not start
changed/repair -> exits 0, RESTORE + RUN + REPORT, agent starts with signed original
```

The nonzero result for `changed/block` is intentional fail-closed behavior, not
an unhandled crash.

## Deterministic CLI verification

Run:

```bash
node bin/free2pa.js verify public/demo/hello-agent/trusted/SOUL.md \
  --trust-store public/demo/hello-agent/trusted-publishers

node bin/free2pa.js verify public/demo/hello-agent/changed/SOUL.md \
  --trust-store public/demo/hello-agent/trusted-publishers
```

Expected:

```text
trusted -> PASS / VERIFIED
changed -> FAIL / CONTENT_CHANGED
```

## What counts as success

Free2PA succeeds when unverified control-file text cannot silently reach model
context. The important boundary is the host read path, not a dashboard. The
application should pass only `LOAD` content to the model, reject unsigned or
untrusted revisions, and report or repair according to explicit host policy.
