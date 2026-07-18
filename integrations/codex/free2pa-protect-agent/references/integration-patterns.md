# Integration Patterns

## Load-gate contract

Apply this order to every protected Nerve Center file:

1. Locate the file and its neighboring `<filename>.c2pa.json` signed receipt.
2. Verify the receipt signature and certificate validity.
3. Compare the current file with the signed asset hash.
4. Check the publisher certificate against this project's trust directory.
5. Apply the host application's configured response: block or quarantine,
   repair from a trusted signed original, alert and continue, or log only.
6. Read the file only when verification passes or the explicit response policy
   permits continuation.

Always verify before reading protected content into model context. A valid
embedded certificate is not enough: the publisher must also exist in the local
project's trust directory. Use fail-closed behavior for the bootstrap example;
applications that continue must make that choice explicit and emit an alert or
log event.

For a repair policy, call the CLI only after verification fails:

```bash
npx free2pa repair agent/SOUL.md \
  --trust-store .free2pa/trusted-publishers \
  --json
```

The command preserves the rejected file by default. It refuses to restore from
an invalid, expired, or outside-group receipt.

## Project layout

```text
.free2pa/
  trusted-publishers/
    project-lead.crt
  publisher-private/       # ignored by version control
free2pa.config.json
scripts/
  verify-nerve-center.mjs
agent/
  SOUL.md
  SOUL.md.c2pa.json
skills/
  research/
    SKILL.md
    SKILL.md.c2pa.json
```

Example manifest:

```json
{
  "trustStore": ".free2pa/trusted-publishers",
  "files": [
    "agent/SOUL.md",
    "skills/research/SKILL.md"
  ]
}
```

## Node bootstrap gate

Prefer a small wrapper around the existing application startup. Run each
verification as a child process so Free2PA remains the single implementation
of the cryptographic rules.

```js
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('free2pa.config.json', 'utf8'));

for (const file of config.files) {
  execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['free2pa', 'verify', file, '--trust-store', config.trustStore],
    { stdio: 'inherit' },
  );
}

await import('../src/start-agent.js');
```

Point the application's start script at this wrapper. Do not catch and ignore
verification failure.

## Publisher setup

Create a time-bounded project identity:

```bash
npx free2pa keygen \
  --name "Project Publisher" \
  --id project-publisher \
  --days 90 \
  --out-dir .free2pa/publisher-private
```

Ignore `.free2pa/publisher-private/` in version control. Admit only its public
certificate to the local group:

```bash
npx free2pa trust add \
  .free2pa/publisher-private/project-publisher.crt \
  --store .free2pa/trusted-publishers \
  --id project-publisher
```

Sign a reviewed file:

```bash
npx free2pa sign agent/SOUL.md \
  --cert .free2pa/publisher-private/project-publisher.crt \
  --key .free2pa/publisher-private/project-publisher.key \
  --title "Agent behavior policy" \
  --actor "Project Publisher"
```

Removing the certificate removes that publisher from this project's group on
the next verification; existing receipts do not need to be rewritten.
