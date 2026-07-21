# Free2PA Devpost ready packet

Generated for OpenAI Build Week / Developer Tools.

## Live Devpost project

- Project: https://devpost.com/software/free2pa
- Devpost project id: `1346166`
- Latest metadata update applied: version `19`
- Existing video URL on Devpost, not replaced yet: https://youtu.be/ENMRlkhARVQ

## Upload-ready assets

Local asset directory:

```text
artifacts/devpost-ready/
```

Upload these 15 stills to the Devpost gallery in numeric order:

```text
artifacts/devpost-ready/stills/01-free2pa.png
artifacts/devpost-ready/stills/02-the-files-steering-agents-are-supply-chain-inputs.png
artifacts/devpost-ready/stills/03-hello-world-shows-the-product-in-miniature.png
artifacts/devpost-ready/stills/04-the-app-asks-one-question.png
artifacts/devpost-ready/stills/05-check-1-receipt-signature.png
artifacts/devpost-ready/stills/06-check-2-file-matches-receipt.png
artifacts/devpost-ready/stills/07-check-3-publisher-trusted-here.png
artifacts/devpost-ready/stills/08-only-verified-text-reaches-context.png
artifacts/devpost-ready/stills/09-the-agent-replies-after-the-gate.png
artifacts/devpost-ready/stills/10-saving-an-edit-is-not-approval.png
artifacts/devpost-ready/stills/11-unsigned-changes-stay-out.png
artifacts/devpost-ready/stills/12-repair-uses-the-signed-original.png
artifacts/devpost-ready/stills/13-intentional-edits-get-a-new-receipt.png
artifacts/devpost-ready/stills/14-install-where-your-app-reads-files.png
artifacts/devpost-ready/stills/15-codex-built-the-product-gpt-5-6-audits-behavior.png
```

Convenience ZIP:

```text
artifacts/devpost-ready/Free2PA-Devpost-15-stills.zip
```

Contact sheet for review:

```text
artifacts/devpost-ready/Free2PA-Devpost-contact-sheet.png
```

New local demo video:

```text
artifacts/devpost-ready/Free2PA-Devpost-demo.mp4
```

Video properties:

- duration: `2:33`
- resolution: `1920x1080`
- audio: Azure Speech narration covering Codex and GPT-5.6
- size: about `4.1 MB`

Upload the MP4 to YouTube as public or unlisted/publicly viewable, then replace
the Devpost video URL.

Suggested YouTube title:

```text
Free2PA — Tamper-evident controls for AI agent files
```

Suggested YouTube description:

```text
Free2PA is a Developer Tools submission for OpenAI Build Week.

Free2PA is C2PA-style provenance with ad-hoc verifiers. Teams can set up their
own local trust group around the files that steer their agents.

It verifies signed receipts for agent control files such as SOUL.md, AGENTS.md,
SKILLS.md, TOOLS.md, prompts, policies, and tool manifests before their text can
enter model context.

Free2PA determines origin and edits of a signed file. It does not certify file
safety, correctness, legality, security, or suitability for any particular use.
It is Apache-2.0 software provided AS IS, without warranties.

Live demo: https://free2pa.org
Repository: https://github.com/kilroyblockchain/free2pa-devtool
LLM brief: https://free2pa.org/llms.txt

Codex helped build the CLI, load gate, MCP integration, tests, demo, docs,
packaging, and submission assets. GPT-5.6 is used as optional behavioral audit;
the provenance verifier remains the hard LOAD/REJECT authority.
```

## Required Devpost fields

These ids came from the live OpenAI Build Week Devpost requirements.

### Submitter Type

Field id: `27945`

Answer:

```text
Individual
```

### Please indicate your Country of Residence.

Field id: `27946`

Answer:

```text
United States
```

### Which category are you submitting to?

Field id: `27947`

Answer:

```text
Developer Tools
```

### URL to your public or private code repo

Field id: `27948`

Answer:

```text
https://github.com/kilroyblockchain/free2pa-devtool
```

### Project for judges to test and necessary instructions

Field id: `27949`

Answer:

```text
Live demo:

https://free2pa.org

Start with the Hello World demo. Click the green wave button to run the tiny
agent. The Free2PA console shows receipt signature, file hash, certificate, and
trusted-publisher checks before SOUL.md enters model context.

To test changed-file behavior, click Edit on the Free2PA verify console, flip
the adjective rule from Never to Always, save, and run again. The saved revision
is unsigned, so Free2PA refuses to load those changed bytes. The app continues
with the last verified signed SOUL.md until the new revision is signed.

Then click Sign it. The local Free2PA console creates a new signed receipt.
Run the app again to see the edited version verify and LOAD.

No credentials are required for judges. The hosted demo uses a scoped Azure
managed identity for the optional model call and does not expose API keys.

Local test path:

git clone https://github.com/kilroyblockchain/free2pa-devtool.git
cd free2pa-devtool
npm ci
npm run check
npx free2pa verify public/demo/hello-agent/trusted/SOUL.md --trust-store public/demo/hello-agent/trusted-publishers --json
npx free2pa verify public/demo/hello-agent/changed/SOUL.md --trust-store public/demo/hello-agent/trusted-publishers --json
```

### /feedback Session ID

Field id: `27950`

Answer:

```text
019f72ea-75e0-7670-8c90-48602c610d24
```

### Dev tool install/testing instructions

Field id: `27951`

Answer:

```text
Install:

npm install --save-dev https://github.com/kilroyblockchain/free2pa-devtool/releases/download/v0.4.2/free2pa-0.4.2.tgz

Supported platforms:

- macOS and Linux
- Node.js 20+
- no OpenAI account required for core signing, verification, repair, load-gate,
  CLI, HTTP, MCP, or CI workflows

Create a publisher, admit it locally, sign a control file, and verify before
loading:

npx free2pa keygen --name \"Project Publisher\" --id project-publisher --out-dir .free2pa/private
npx free2pa trust add .free2pa/private/project-publisher.crt --store .free2pa/trusted-publishers --id project-publisher
npx free2pa sign agent/SOUL.md --cert .free2pa/private/project-publisher.crt --key .free2pa/private/project-publisher.key
npx free2pa verify agent/SOUL.md --trust-store .free2pa/trusted-publishers --json

For Node apps:

import { loadVerifiedFile } from 'free2pa/load-gate';

const instructions = await loadVerifiedFile({
  assetPath: 'agent/SOUL.md',
  trustStore: '.free2pa/trusted-publishers',
});

The same verifier is available through the CLI, HTTP API, MCP verify_asset,
GitHub Action, and an installable Codex retrofit skill.
```

## Submission custom_answers payload

Use this only if submitting through the Devpost connector:

```json
[
  { "submission_field_id": 27945, "value": "Individual" },
  { "submission_field_id": 27946, "value": ["United States"] },
  { "submission_field_id": 27947, "value": "Developer Tools" },
  { "submission_field_id": 27948, "value": "https://github.com/kilroyblockchain/free2pa-devtool" },
  { "submission_field_id": 27949, "value": "Live demo: https://free2pa.org\n\nStart with the Hello World demo. Click the green wave button to run the tiny agent. The Free2PA console shows receipt signature, file hash, certificate, and trusted-publisher checks before SOUL.md enters model context.\n\nTo test changed-file behavior, click Edit on the Free2PA verify console, flip the adjective rule from Never to Always, save, and run again. The saved revision is unsigned, so Free2PA refuses to load those changed bytes. The app continues with the last verified signed SOUL.md until the new revision is signed.\n\nThen click Sign it. The local Free2PA console creates a new signed receipt. Run the app again to see the edited version verify and LOAD.\n\nNo credentials are required for judges. The hosted demo uses a scoped Azure managed identity for the optional model call and does not expose API keys." },
  { "submission_field_id": 27950, "value": "019f72ea-75e0-7670-8c90-48602c610d24" },
  { "submission_field_id": 27951, "value": "Install:\n\nnpm install --save-dev https://github.com/kilroyblockchain/free2pa-devtool/releases/download/v0.4.2/free2pa-0.4.2.tgz\n\nSupported platforms: macOS, Linux, Node.js 20+. No OpenAI account is required for core signing, verification, repair, load-gate, CLI, HTTP, MCP, or CI workflows.\n\nCreate a publisher, admit it locally, sign a control file, and verify before loading:\n\nnpx free2pa keygen --name \"Project Publisher\" --id project-publisher --out-dir .free2pa/private\nnpx free2pa trust add .free2pa/private/project-publisher.crt --store .free2pa/trusted-publishers --id project-publisher\nnpx free2pa sign agent/SOUL.md --cert .free2pa/private/project-publisher.crt --key .free2pa/private/project-publisher.key\nnpx free2pa verify agent/SOUL.md --trust-store .free2pa/trusted-publishers --json\n\nFor Node apps, import loadVerifiedFile from free2pa/load-gate and call it where the app reads prompts, skills, policies, or tool manifests. The same verifier is available through the CLI, HTTP API, MCP verify_asset, GitHub Action, and an installable Codex retrofit skill." }
]
```
