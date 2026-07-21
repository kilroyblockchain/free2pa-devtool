# Free2PA + OpenClaw Integration Guide

### How to run a verified skill registry on a shared VM or Raspberry Pi

---

## The Problem This Solves

OpenClaw loads `SKILL.md` files from disk and feeds them to an AI agent. It has a static security scanner that looks for suspicious code patterns, but it has **no cryptographic verification** — it cannot tell whether a skill file has been tampered with, who signed it, or whether the author is someone your team trusts.

Free2PA fills that gap. It signs skill files and produces a portable `.c2pa.json` sidecar that records who signed the skill, when, and cryptographically binds that signature to the exact content of the file. If the file changes after signing, verification fails.

When the two systems share a filesystem — as in a VM — the `radio_intern/` folder becomes a **signed skill registry**: every skill in it was signed by a known identity and has not been altered since.

---

## How the Two Systems Fit Together

```
Skill Author
    │
    │  uploads SKILL.md to Free2PA UI
    │  fills in: skill name, purpose, name, email
    ▼
Free2PA (http://<vm>:4001)
    │
    │  signs the file with ECDSA P-256 cert
    │  writes SKILL.md.c2pa.json sidecar
    ▼
radio_intern/<skill-name>/
    ├── SKILL.md                ← skill instructions for the agent
    └── SKILL.md.c2pa.json      ← provenance sidecar (who signed, when, hash)
    │
    │  OpenClaw reads this directory via extraDirs
    ▼
OpenClaw Agent
    │
    │  loads SKILL.md into context window
    │  agent can call POST /api/skills/:name/verify
    │  to check the sidecar before acting on the skill
    ▼
Agent behavior governed by verified, trusted skills only
```

### Beyond `SKILL.md`: bundle the agent’s brain files

OpenClaw deployments like the RadioHead demo (`~/zorro_kilroy/karenkilroy/public/free2pa/`) load a *suite* of Markdown controllers before each session. The uppercase files are the canonical “brain” docs an agent trusts implicitly, so they deserve the same signing and verification treatment:

| File | Purpose in RadioHead |
|---|---|
| `AGENTS.md` | Boot protocol: startup checklist, safety rails, memory discipline. |
| `SOUL.md` | Persona + boundaries; dictates tone and risk posture. |
| `USER.md` | Human profile; contains potentially sensitive context. |
| `IDENTITY.md` | Job overlay (RadioHead 🎸 role) that the agent copies into outward messaging. |
| `MEMORY.md` | Long-term diary reference; gets loaded in main sessions. |
| `HEARTBEAT.md` | Background checklist consumed by cron-style “heartbeat” prompts. |
| `APPS.md` | Custom runbook for the `/apps` microservices powering the OpenClaw environment. |

Treat each of these exactly like a skill file: keep the `.md` in the workspace, sign it via Free2PA, and store the resulting `.c2pa.json` beside it. That way, whether the agent is reading `SKILL.md`, `SOUL.md`, `HEARTBEAT.md`, or a lowercase custom runbook, the loader can run the same hash + signature + trust checks before the content ever hits the model’s context window. Some teams rename or add files (`workflow.md`, `tests.md`, `memory/2024-12-01.md`, etc.); the rule of thumb is simple — if the agent trusts the text, give it a Free2PA sidecar.

### Enforce verification inside OpenClaw

Update your OpenClaw bootstrap script so it refuses to load any Markdown file (skill, persona, heartbeat, workflow, etc.) unless the Free2PA verifier says all three checks pass. A common pattern:

1. Maintain a manifest (`.openclaw/agent-files.json`) that lists every path the agent should read on startup (uppercase standards plus custom docs).
2. Before pushing file content into the context window, call `POST /api/verify` (or `POST /api/skills/:name/verify` for items under `radio_intern/`) with the `.md` file and its neighboring `.c2pa.json`.
3. Only on successful signature + hash + trust results do you stream the Markdown into the LLM.
4. If verification fails, halt the session and alert the operator — the agent should never ingest unsigned or tampered instructions.

This keeps OpenClaw honest even when teams add new Markdown surfaces or rename existing ones: every context file, regardless of casing or naming convention, goes through the same Free2PA gate.

#### Reference implementation pieces

**Manifest (`.openclaw/agent-files.json`):**

```json
{
  "bundle": [
    { "name": "AGENTS",   "path": "/data/workspace/free2pa/AGENTS.md" },
    { "name": "SOUL",     "path": "/data/workspace/free2pa/SOUL.md" },
    { "name": "USER",     "path": "/data/workspace/free2pa/USER.md" },
    { "name": "IDENTITY", "path": "/data/workspace/free2pa/IDENTITY.md" },
    { "name": "MEMORY",   "path": "/data/workspace/free2pa/MEMORY.md" },
    { "name": "HEARTBEAT","path": "/data/workspace/free2pa/HEARTBEAT.md" },
    { "name": "APPS",     "path": "/data/workspace/free2pa/APPS.md" },
    { "name": "workflow", "path": "/data/workspace/free2pa/workflow.md" },
    { "name": "tests",    "path": "/data/workspace/free2pa/tests.md" }
  ]
}
```

**Verifier shim (`scripts/verify-agent-files.js`):**

```js
#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import fetch from "node-fetch"; // or global fetch in Node 20+

const FREE2PA_URL = process.env.FREE2PA_URL ?? "http://localhost:4001/api/verify";
const manifest = JSON.parse(fs.readFileSync(".openclaw/agent-files.json", "utf8"));

for (const entry of manifest.bundle) {
  const sidecarPath = `${entry.path}.c2pa.json`;
  const fileStream = fs.createReadStream(entry.path);
  const sidecarStream = fs.createReadStream(sidecarPath);

  const form = new FormData();
  form.append("file", fileStream, path.basename(entry.path));
  form.append("sidecar", sidecarStream, path.basename(sidecarPath));

  const response = await fetch(FREE2PA_URL, { method: "POST", body: form });
  const result = await response.json();

  if (!result.signatureValid || !result.hashMatch || !result.trust?.trusted) {
    console.error(`[FAIL] ${entry.name} — signature:${result.signatureValid} hash:${result.hashMatch} trust:${result.trust?.detail}`);
    process.exit(1);
  }

  console.log(`[PASS] ${entry.name} (${entry.path})`);
}
```

> Node 20+ ships with `fetch` and `FormData`. On older runtimes add `import fetch from "node-fetch"; import FormData from "form-data";`.

**Bootstrap hook (`start-openclaw.sh` excerpt):**

```bash
set -euo pipefail
node scripts/verify-agent-files.js
exec openclaw start --config ~/.openclaw/openclaw.json
```

Drop these pieces into your deployment and OpenClaw will refuse to boot if any Markdown brain file or skill fails verification. The agent never sees unsigned context, and you get a single log that names whichever file triggered the halt.

---

## VM Setup

Both services run on the same VM. They share the filesystem. No network calls between them are required for basic operation — verification happens through the shared folder.

### Step 1 — Install and start Free2PA

```bash
git clone <your-free2pa-repo>
cd free2pa
npm install
npm run generate-cert          # creates certs/signing.crt + certs/signing.key
npm start                      # listening on :4001
```

For production, run it as a systemd service or under `pm2`:

```bash
pm2 start "npm start" --name free2pa --cwd /opt/free2pa
pm2 save
```

### Step 2 — Create the shared skill folder

`radio_intern/` lives inside the Free2PA project root by default
(`/opt/free2pa/radio_intern/`). Each skill gets its own subfolder:

```
radio_intern/
  transcription/
    SKILL.md
    SKILL.md.c2pa.json
  weather/
    SKILL.md
    SKILL.md.c2pa.json
```

The folder is created automatically when Free2PA starts. To put it somewhere
else, set `SKILLS_DIR` in `.env`:

```bash
SKILLS_DIR=/shared/skills
```

### Step 3 — Configure OpenClaw to read from the shared folder

In `~/.openclaw/openclaw.json`, add the Free2PA skill folder to
`skills.load.extraDirs`:

```json5
{
  "skills": {
    "load": {
      "extraDirs": [
        "/opt/free2pa/radio_intern"
      ]
    }
  }
}
```

OpenClaw will now discover every `SKILL.md` in that folder and load it into
the agent's context alongside its bundled and managed skills.

> **Note:** `extraDirs` is additive. Your existing skills (bundled, managed,
> workspace) are unaffected.

---

## Signing a Skill

1. Open `http://<vm>:4001/` in a browser.
2. Drop your `SKILL.md` onto the **Sign a Skill** panel.
3. Fill in **Skill name**, **Your name**, **Your email**, and **Purpose**.
4. Select a signing certificate (or generate one).
5. Click **Sign & Download Sidecar**.
6. Move the downloaded `.c2pa.json` file into the skill's subfolder in
   `radio_intern/`:

```bash
mv ~/Downloads/SKILL.md.c2pa.json \
   /opt/free2pa/radio_intern/transcription/SKILL.md.c2pa.json
```

The skill is now in the registry with a valid sidecar. OpenClaw will pick it
up on its next skill reload (or immediately if `skills.load.watch: true`).

---

## Verifying Skills

### Via the test client

Open `http://<vm>:4001/test.html`. It lists every skill in `radio_intern/`
with a radio button. Select one and click **Test Selected Skill**. A robot
face tells you PASS or FAIL, and the three checks are shown individually:

| Check | What it proves |
|---|---|
| **Signature** | The ECDSA signature in the sidecar verifies against the cert. The claim record has not been altered. |
| **File integrity** | SHA-256 of the current `SKILL.md` matches the hash recorded at signing time. The file has not been modified. |
| **Trust** | The signing cert is in Free2PA's `certs/` trust store. The author is someone this server recognizes. |

### Via the REST API

```bash
# List all skills and their sidecar status
curl http://localhost:4001/api/skills

# Verify a specific skill
curl -X POST http://localhost:4001/api/skills/transcription/verify
```

Response:

```json
{
  "success": true,
  "signatureValid": true,
  "hashMatch": true,
  "trust": {
    "profile": "dev",
    "trusted": true,
    "label": "Server/Dev",
    "detail": "Cert is in this server's trust store (matched: signing)"
  },
  "claim": { "..." }
}
```

### Via the MCP server

Free2PA exposes an MCP server at `POST /mcp` (Streamable HTTP transport) with
two tools:

- **`list_skills`** — returns the same list as `GET /api/skills`
- **`verify_skill({ name })`** — verifies a named skill, returns `PASS`/`FAIL`
  with all three check results

Any MCP-capable client or agent runtime that can reach `http://<vm>:4001/mcp`
can call these tools directly.

---

## Important: How OpenClaw Handles MCP

OpenClaw uses its own tool system internally. Its ACP bridge (the stdio
protocol used by IDE integrations like Claude Code) **explicitly ignores MCP
servers** — if you pass MCP server config to the ACP bridge, OpenClaw logs
"ignoring N MCP servers" and continues without them.

This means:

- You **cannot** configure `free2pa` as an MCP server inside OpenClaw's
  `openclaw.json` and expect OpenClaw's agent to call it automatically.
- Verification happens **outside** the agent loop, at the registry level.

The correct integration points are:

1. **Pre-flight script** (recommended) — verify all skills before OpenClaw
   starts or before a session begins.
2. **A verification skill** — teach the OpenClaw agent to call Free2PA's REST
   API as part of its own reasoning.
3. **External MCP client** — a separate agent or tool outside OpenClaw that
   uses the MCP server to gate which skills get promoted into the registry.

---

## Pre-Flight Verification Script

Run this script before launching OpenClaw (or as a cron job) to verify every
skill in the registry and quarantine any that fail:

```bash
#!/usr/bin/env bash
# verify-skills.sh
# Verifies all skills in radio_intern via Free2PA.
# Moves failed skills to radio_intern-quarantine/.

set -euo pipefail

SKILLS_DIR="/opt/free2pa/radio_intern"
QUARANTINE_DIR="/opt/free2pa/radio_intern-quarantine"
FREE2PA_URL="http://localhost:4001"
FAILED=0

mkdir -p "$QUARANTINE_DIR"

skills=$(curl -s "$FREE2PA_URL/api/skills" | \
  python3 -c "import sys,json; [print(s['name']) for s in json.load(sys.stdin)['skills'] if s['hasSidecar']]")

for skill in $skills; do
  result=$(curl -s -X POST "$FREE2PA_URL/api/skills/$skill/verify")
  sig=$(echo "$result"   | python3 -c "import sys,json; print(json.load(sys.stdin)['signatureValid'])")
  hash=$(echo "$result"  | python3 -c "import sys,json; print(json.load(sys.stdin)['hashMatch'])")
  trust=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin)['trust']['trusted'])")

  if [ "$sig" = "True" ] && [ "$hash" = "True" ] && [ "$trust" = "True" ]; then
    echo "PASS  $skill"
  else
    echo "FAIL  $skill — moving to quarantine"
    mv "$SKILLS_DIR/$skill" "$QUARANTINE_DIR/$skill"
    FAILED=$((FAILED + 1))
  fi
done

if [ $FAILED -gt 0 ]; then
  echo ""
  echo "$FAILED skill(s) failed verification and were quarantined."
  echo "Check $QUARANTINE_DIR for details."
  exit 1
fi

echo ""
echo "All skills verified. Starting OpenClaw."
```

Wire this into your startup sequence:

```bash
# In your VM startup or systemd ExecStartPre:
bash /opt/free2pa/verify-skills.sh && openclaw gateway start
```

---

## Verification Skill (Agent-Side Checking)

You can also add a skill to OpenClaw that teaches the agent to verify skills
on demand before using them. Create this file at
`~/.openclaw/skills/free2pa-verify/SKILL.md`:

```markdown
---
name: free2pa-verify
description: Verify that a skill in radio_intern has a valid Free2PA credential before using it. Use when asked to check whether a skill is trusted, signed, or safe to load.
---

# Free2PA Skill Verification

Before using a skill from the shared registry, verify it is signed and trusted.

## How to verify

Call the Free2PA REST API:

    POST http://localhost:4001/api/skills/<skill-name>/verify

A skill PASSES if all three are true in the response:
- `signatureValid: true`
- `hashMatch: true`
- `trust.trusted: true`

If any check fails, report the specific failure to the user and do not proceed
with loading or acting on that skill's instructions.

## Example

User: "Use the transcription skill."

Before acting:
1. POST http://localhost:4001/api/skills/transcription/verify
2. Check all three fields.
3. If PASS: proceed.
4. If FAIL: tell the user which check failed and why.
```

With this skill loaded, the OpenClaw agent will know to call Free2PA before
acting on any skill from the shared registry.

---

## Trust Store Management

The `certs/` directory on the Free2PA server is the trust store. Every `.crt`
file in it represents a trusted signing identity.

**To export your cert (share with peers):**

In the **Sign panel**, select your certificate and click the **⬇** button next
to the dropdown. Your `.crt` file downloads immediately — share this file with
anyone who should be able to verify your skills.

**To add a trusted publisher (via UI):**

In the **Sign panel**, click **+ Import Certificate(s)**. Drop the `.crt` file
you received from your peer. Optionally name it (e.g., `jkilroy-team-a`).
Click **Import Certificate(s)**. Free2PA validates it is a real X.509 cert
before saving.

**To add a team bundle (multiple certs at once):**

Use the same **+ Import Certificate(s)** drop zone but select or drop multiple
`.crt` files. All are validated and imported in one step. Each cert is saved
under its filename stem unless you override the name (single-file only).

**To add a trusted publisher (via command line):**

```bash
# Copy their cert into Free2PA's trust store
cp team-member.crt /opt/free2pa/certs/team-member.crt
```

**To revoke trust:**

```bash
rm /opt/free2pa/certs/team-member.crt
```

Any skill signed with the removed cert will now fail the Trust check
immediately, without requiring changes to the skill files themselves.

**To allow a remote team's skills:**

Each team runs their own Free2PA server with their own cert. To trust their
skills on your server, import just their `.crt` (not the key) — via the UI
import or the command-line copy above. Their skills will pass the Trust check
on your server.

---

## Full VM Layout

```
/opt/free2pa/                       Free2PA service root
├── certs/
│   ├── signing.crt                 Default signing cert (in trust store)
│   ├── signing.key                 Private key (keep secure, never commit)
│   └── team-member.crt             Additional trusted publisher
├── radio_intern/                   Shared skill registry
│   ├── transcription/
│   │   ├── SKILL.md
│   │   └── SKILL.md.c2pa.json
│   └── weather/
│       ├── SKILL.md
│       └── SKILL.md.c2pa.json
└── radio_intern-quarantine/        Skills that failed verification (isolated)

~/.openclaw/
├── openclaw.json                   OpenClaw config
│   └── skills.load.extraDirs: ["/opt/free2pa/radio_intern"]
└── skills/
    └── free2pa-verify/             Verification skill (optional)
        └── SKILL.md
```

---

## Raspberry Pi Setup: Step-by-Step

This section walks through installing Free2PA on a Raspberry Pi that already
runs OpenClaw, so both services share the same skill folder. Your laptop
browser signs skills; OpenClaw loads them; Free2PA proves nothing was tampered
with.

### What you need

| Requirement | Minimum | Notes |
|---|---|---|
| Pi model | Raspberry Pi 4 | Pi 5 preferred; 3B+ works with swap |
| RAM | 2 GB | 4 GB recommended |
| OS | Raspberry Pi OS Lite 64-bit | Must be 64-bit. Check: `uname -m` → `aarch64` |
| Node.js | 20 or higher | OpenClaw requires 22; share the same install |
| `openssl` | any | Pre-installed on Raspberry Pi OS |
| OpenClaw | already installed | Running via systemd user service |

---

### Step 1 — Verify your Pi is ready

SSH into the Pi and check:

```bash
# Must say aarch64 (64-bit). If it says armv7l, you need to re-flash with 64-bit OS.
uname -m

# Must be 20 or higher. If missing or too old, see "Install Node.js" below.
node --version

# Must exist
openssl version
```

**If Node.js is missing or below v20**, install it:

```bash
# Install Node.js 22 via NodeSource (works on Raspberry Pi OS / Debian)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # should print v22.x.x
```

---

### Step 2 — Clone Free2PA onto the Pi

```bash
# From your SSH session on the Pi:
cd ~
git clone <your-free2pa-repo-url> free2pa
cd free2pa
npm install
```

If you don't have a repo yet, copy the project folder from your Mac:

```bash
# From your Mac (replace pi.local with your Pi's hostname or IP):
rsync -av --exclude node_modules --exclude certs \
  ~/zorro_kilroy/free2pa/ pi@pi.local:~/free2pa/
# Then on the Pi:
cd ~/free2pa && npm install
```

---

### Step 3 — Generate a signing certificate

```bash
cd ~/free2pa
npm run generate-cert
```

This creates `certs/signing.crt` and `certs/signing.key`. The cert is what
goes in the sidecar and is checked against the trust store at verify time.

> Keep `certs/signing.key` on the Pi only. Never copy it off the device or
> commit it to git. The `.crt` file is safe to share.

---

### Step 4 — Run Free2PA as a systemd service

Create a systemd **user** service (same style as OpenClaw's own service):

```bash
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/free2pa.service << 'EOF'
[Unit]
Description=Free2PA Skill Credential Server
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=%h/free2pa
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5
Environment=PORT=4001

[Install]
WantedBy=default.target
EOF
```

Enable and start it:

```bash
# Enable lingering so the service starts at boot without a login session
loginctl enable-linger $USER

# Load the new unit file
systemctl --user daemon-reload

# Enable and start
systemctl --user enable free2pa
systemctl --user start free2pa

# Confirm it's running
systemctl --user status free2pa
```

Check the log:

```bash
journalctl --user -u free2pa -f
```

You should see: `Free2PA v0.1.0  —  http://localhost:4001`

---

### Step 5 — Find your Pi's IP address

```bash
hostname -I
# Example output: 192.168.1.42
```

From your **laptop browser**, open:

```
http://192.168.1.42:4001/
```

You should see the Free2PA Sign & Verify UI. If it doesn't load, check the
firewall:

```bash
# Raspberry Pi OS doesn't enable a firewall by default, so this usually just works.
# If you have ufw enabled:
sudo ufw allow 4001/tcp
```

---

### Step 6 — Configure OpenClaw to read from radio_intern

Open the OpenClaw config file on the Pi:

```bash
nano ~/.openclaw/openclaw.json
```

Add the `skills.load` block. If `skills` already exists, merge these keys in:

```json5
{
  // ... your existing config ...

  "skills": {
    "load": {
      "extraDirs": [
        "/home/pi/free2pa/radio_intern"
      ],
      "watch": true
    }
  }
}
```

> Replace `/home/pi` with your actual home directory if different
> (check with `echo $HOME`).

`watch: true` means OpenClaw picks up new or updated skills automatically —
no restart needed when you add a newly signed skill to the folder.

Restart OpenClaw to apply the config change:

```bash
systemctl --user restart openclaw-gateway
# or whatever your OpenClaw service is named:
systemctl --user list-units | grep openclaw
```

Confirm OpenClaw sees the new skill directory:

```bash
openclaw skills list
# Your radio_intern skills should appear in the list
```

---

### Step 7 — Verify the integration end to end

From your laptop browser on the same network:

1. Go to `http://192.168.1.42:4001/`
2. Drop a `SKILL.md` onto the Sign panel
3. Fill in the provenance fields
4. Select the `signing` certificate and click **Sign & Download Sidecar**
5. The `.c2pa.json` file downloads to your laptop

Now put both files into the Pi's `radio_intern` folder. You can do this from
your laptop:

```bash
# Copy the skill file and sidecar to the Pi
scp SKILL.md pi@pi.local:~/free2pa/radio_intern/my-skill/SKILL.md
scp SKILL.md.c2pa.json pi@pi.local:~/free2pa/radio_intern/my-skill/SKILL.md.c2pa.json
```

Because `watch: true` is set, OpenClaw will pick up the skill within a few
seconds.

Open the test client to confirm verification passes:

```
http://192.168.1.42:4001/test.html
```

Select the skill and click **Test Selected Skill**. The robot should be happy
and green. If it fails, the check rows will tell you exactly which of the
three checks failed and why.

---

### Step 8 — Wire the pre-flight check into OpenClaw's startup

Edit OpenClaw's systemd service to verify skills before the gateway starts.
First, find the service file:

```bash
systemctl --user cat openclaw-gateway
# Note the path shown at the top, e.g.:
# /home/pi/.config/systemd/user/openclaw-gateway.service
```

Create a `verify-skills.sh` script on the Pi:

```bash
cat > ~/free2pa/verify-skills.sh << 'EOF'
#!/usr/bin/env bash
# verify-skills.sh — run before OpenClaw starts
set -euo pipefail

BASE="http://localhost:4001"
SKILLS_DIR="$HOME/free2pa/radio_intern"
QUARANTINE="$HOME/free2pa/radio_intern-quarantine"
FAILED=0

mkdir -p "$QUARANTINE"

# Get list of skills that have sidecars
skills=$(curl -sf "$BASE/api/skills" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for s in data.get('skills', []):
    if s['hasSidecar']:
        print(s['name'])
")

for skill in $skills; do
  result=$(curl -sf -X POST "$BASE/api/skills/$skill/verify" || echo '{}')
  sig=$(echo   "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('signatureValid', False))")
  hash=$(echo  "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('hashMatch', False))")
  trust=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('trust',{}).get('trusted', False))")

  if [ "$sig" = "True" ] && [ "$hash" = "True" ] && [ "$trust" = "True" ]; then
    echo "PASS  $skill"
  else
    echo "FAIL  $skill — quarantined"
    mv "$SKILLS_DIR/$skill" "$QUARANTINE/$skill"
    FAILED=$((FAILED + 1))
  fi
done

[ $FAILED -eq 0 ] && echo "All skills verified." || echo "$FAILED skill(s) quarantined."
EOF

chmod +x ~/free2pa/verify-skills.sh
```

Add it as an `ExecStartPre` in OpenClaw's service. Edit the unit file:

```bash
nano ~/.config/systemd/user/openclaw-gateway.service
```

Add this line inside `[Service]`, before `ExecStart`:

```ini
[Service]
ExecStartPre=/home/pi/free2pa/verify-skills.sh
ExecStart=...
```

Reload:

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw-gateway
journalctl --user -u openclaw-gateway -f
```

You'll see `PASS  transcription` (or similar) logged before OpenClaw starts.
Any skill that fails gets moved to `radio_intern-quarantine/` and OpenClaw
never sees it.

---

### Startup Order

The two services are independent — they don't depend on each other at the
system level. The pre-flight script is what connects them at startup:

```
Boot
 │
 ├─ free2pa.service starts  (port 4001, serves UI + API)
 │
 └─ openclaw-gateway.service starts
        │
        ├─ ExecStartPre: verify-skills.sh
        │       └─ calls Free2PA REST API for each skill
        │       └─ quarantines failures
        │
        └─ ExecStart: openclaw gateway
                └─ loads skills from radio_intern/ (verified)
                └─ begins accepting agent sessions
```

To ensure Free2PA is up before the pre-flight script runs, add an ordering
dependency to OpenClaw's service:

```ini
[Unit]
Description=OpenClaw Gateway
After=network-online.target free2pa.service
Wants=free2pa.service
```

---

### Full Pi Layout

```
/home/pi/
├── free2pa/                        Free2PA service root
│   ├── certs/
│   │   ├── signing.crt             Signing cert (trust store)
│   │   └── signing.key             Private key — keep on Pi only
│   ├── radio_intern/               Shared skill registry
│   │   └── transcription/
│   │       ├── SKILL.md
│   │       └── SKILL.md.c2pa.json
│   ├── radio_intern-quarantine/    Skills that failed pre-flight
│   └── verify-skills.sh            Pre-flight script
│
└── .openclaw/
    ├── openclaw.json               skills.load.extraDirs → radio_intern
    └── skills/
        └── free2pa-verify/         Optional: agent verification skill
            └── SKILL.md

~/.config/systemd/user/
├── free2pa.service                 Free2PA — starts at boot
└── openclaw-gateway.service        OpenClaw — ExecStartPre runs verify-skills.sh
```

---

### Signing from Your Laptop

Once the Pi is running, your workflow from the Mac is:

1. Write a `SKILL.md` on your laptop.
2. Open `http://<pi-ip>:4001/` in your browser.
3. Drop the file onto the Sign panel, fill in provenance, click **Sign**.
4. The sidecar (`.c2pa.json`) downloads to your laptop.
5. `scp` both files into the right `radio_intern/<skill-name>/` subfolder on the Pi.
6. OpenClaw picks it up within seconds (watch mode).
7. Confirm at `http://<pi-ip>:4001/test.html`.

---

### Troubleshooting

| Symptom | Check |
|---|---|
| UI not reachable from laptop | `systemctl --user status free2pa` · `curl http://localhost:4001/health` on Pi · firewall: `sudo ufw status` |
| Skills not appearing in OpenClaw | `openclaw skills list` · confirm `extraDirs` path is exact and absolute · check `watch: true` is set |
| FAIL — Signature invalid | The sidecar was signed by a cert not in `certs/`. Import the signing cert via the UI (Sign panel → + Import Certificate(s)) or copy the `.crt` into `certs/` manually. |
| FAIL — Hash mismatch | The `SKILL.md` was edited after signing. Re-sign the file. |
| FAIL — Trust check | The signing cert is not in Free2PA's `certs/` trust store on the Pi. |
| Pre-flight script hangs | Free2PA may not be up yet. Add `After=free2pa.service` to OpenClaw's unit. |
| `SKILLS_DIR` mismatch | Check `.env` on the Pi. Default is `radio_intern` relative to the Free2PA working dir. Use absolute path to be safe. |

---

## Quick Reference

| Task | How |
|---|---|
| Sign a skill | `http://<pi-ip>:4001/` → Sign panel |
| Test a skill | `http://<pi-ip>:4001/test.html` |
| List skills via API | `GET /api/skills` |
| Verify a skill via API | `POST /api/skills/<name>/verify` |
| Call from an MCP client | `POST /mcp` — tools: `list_skills`, `verify_skill` |
| Export your signing cert | Sign panel → select cert → ⬇ button |
| Import a peer cert | Sign panel → + Import Certificate(s) → drop one `.crt` |
| Import a team bundle | Sign panel → + Import Certificate(s) → drop multiple `.crt` files |
| Add a trusted cert (CLI) | Copy `.crt` into `certs/` on Pi |
| Revoke a cert | Delete `.crt` from `certs/` on Pi |
| Point OpenClaw at registry | `skills.load.extraDirs` in `~/.openclaw/openclaw.json` |
| Pre-flight verification | `verify-skills.sh` as `ExecStartPre` in OpenClaw's unit |
| Check Free2PA logs | `journalctl --user -u free2pa -f` |
| Check OpenClaw logs | `journalctl --user -u openclaw-gateway -f` |
| Restart both services | `systemctl --user restart free2pa openclaw-gateway` |
