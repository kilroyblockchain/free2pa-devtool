# Free2PA — AI Agent Skill Credentials

Free2PA is a content-credential system for AI agent skill files. It lets you **sign** a skill file and produce a portable sidecar that proves the file has not been tampered with and was issued by a trusted party. A verifier — or an MCP server acting as a gatekeeper — can check that sidecar before allowing the skill to be loaded by an agent.

---

## Why This Exists

Agentic AI systems are only as trustworthy as the skills they execute. A skill file (`.md`, `.txt`, or any text format) tells an agent what it can do, how to call tools, and what rules to follow. This is a weak link: a bad actor who can insert or modify a skill file can redirect an agent's behavior — silently, at scale.

Free2PA closes that gap by treating skill files the same way software supply chains treat build artifacts: **sign what you publish, verify before you run.**

```
Author / Publisher
    │
    │  signs skill.md
    ▼
skill.md.c2pa.json  ← sidecar manifest (signature + provenance claims)
    │
    │  travels with skill.md
    ▼
MCP Server / Verifier
    │
    ├─ Is the signature cryptographically valid?
    ├─ Does the file hash still match what was signed?
    └─ Is the signing cert in my trust store?
         │
         ├─ YES to all → skill is loaded
         └─ NO to any  → skill is rejected
```

---

## How It Works

### The Sidecar Manifest

Signing a skill file does **not** modify the file itself. Instead, a companion file is created alongside it:

```
skill.md               ← your skill file, unchanged
skill.md.c2pa.json     ← Free2PA sidecar manifest
```

The sidecar is a JSON document with three top-level fields:

```jsonc
{
  "spec_version": "free2pa/0.1.0",

  "claim": {
    "claim_generator": "Friends of Justin / Free2PA v0.1.0",
    "dc:title": "My Skill",
    "asset": {
      "format":   "text/markdown",
      "hash_alg": "sha256",
      "hash":     "<sha256 of skill.md at signing time>"
    },
    "assertions": [
      {
        "label": "c2pa.actions",
        "data": {
          "actions": [{
            "action": "c2pa.created",
            "when":   "<ISO timestamp>",
            "actor":  "publisher-handle"
          }]
        }
      },
      {
        "label": "org.friends-of-justin.skill",
        "data": {
          "course":     "optional provenance metadata",
          "assignment": "...",
          "repo":       "...",
          "student_id": "...",
          "instructor": "..."
        }
      }
    ],
    "signed_at": "<ISO timestamp>"
  },

  "signature": {
    "alg":      "ES256",
    "cert_pem": "<PEM of the signing certificate>",
    "value":    "<base64 ECDSA P-256 signature over canonicalJson(claim)>"
  }
}
```

The claim is serialized using **canonical JSON** (keys sorted recursively, no whitespace) before signing, so the signature is stable regardless of how the JSON was originally formatted.

### The Three Checks

Every verification produces three independent verdicts:

| Check | What it proves |
|---|---|
| **Signature valid** | The ECDSA P-256 signature in the sidecar was made by the private key corresponding to the cert embedded in the sidecar. The claim has not been altered. |
| **Hash match** | The SHA-256 of the skill file you uploaded today matches the hash that was recorded at signing time. The file has not been modified. |
| **Trust** | The signing certificate is recognized under the selected trust profile. The issuer is someone your system trusts. |

Checks 1 and 2 are purely cryptographic and require no server state. Check 3 depends on the trust profile configured on the verifying side.

---

## Certificates and the Trust Store

### How Certificates Work

Free2PA uses **self-signed ECDSA P-256 certificates** (the same curve used by C2PA/W3C Verifiable Credentials). Each certificate represents a signing identity — a person, a team, an automated publisher, or a deployment.

- The private key signs the sidecar at publish time.
- The certificate (public key + metadata) travels inside the sidecar, so verifiers have everything they need.
- The server's `certs/` directory acts as the **trust store**: any certificate stored there is trusted under the `Server/Dev` profile.

### Generating a Certificate

From the UI: open the **Sign** panel, expand **Generate New Certificate**, fill in a Common Name and Organization, and click **Generate Certificate**. The cert and key are written to `certs/<slug>.crt` and `certs/<slug>.key` on the server.

From the command line:

```bash
npm run generate-cert
# or with overrides:
ORG_NAME="Acme AI" COMMON_NAME="agent-publisher-v1" VALIDITY_DAYS=365 \
  bash certs/generate-cert.sh
```

The script uses `openssl` to produce a cert with:
- `keyUsage = critical, digitalSignature` — the cert is scoped to signing only
- `CA:FALSE` — it cannot be used to issue other certificates

### The Trust Store

The `certs/` directory on the server **is** the trust store. To trust a cert, put it there. To revoke trust, remove it. No config file or database is involved.

```
certs/
  signing.crt       ← default cert generated by npm run generate-cert
  signing.key
  jkilroy.crt       ← additional cert for a specific publisher
  jkilroy.key
  agent-v2.crt      ← cert-only import (no key required for verification)
```

---

## Trust Profiles

### Server / Dev

**Default profile.** Trusted if the sidecar cert matches any certificate in `certs/`.

- **No cert selected in UI** → scans all `.crt` files; passes if any match; the verdict detail names which cert matched.
- **Specific cert selected** → strict match against that cert only. Use this to confirm a skill was signed by a particular identity.

This is the profile an MCP server would use for local or organizational deployments: populate `certs/` with the certs you approve, and every skill signed by any of them passes automatically.

### Org

Placeholder. Intended for a shared CA bundle — an organization issues a root CA, signs publisher certificates from it, and verifiers check the chain. This enables a larger trust domain without requiring every verifier to know every individual cert.

### Public

Placeholder. Intended for a public trust list (analogous to the C2PA Trust List or a WebPKI root store). Requires commercially-issued certificates. Appropriate for public skill marketplaces.

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- `openssl` on your PATH

### Install and run

```bash
npm install
npm run generate-cert   # creates certs/signing.crt and certs/signing.key
npm start               # http://localhost:4001
```

Or for development with auto-reload:

```bash
npm run dev
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4001` | HTTP port |
| `CERT_PATH` | `certs/signing.crt` | Default signing cert path |
| `KEY_PATH` | `certs/signing.key` | Default signing key path |
| `CERTS_DIR` | `certs` | Trust store directory |
| `UPLOAD_DIR` | `uploads` | Temp dir for multipart uploads |

Copy `.env.example` to `.env` to override defaults.

---

## API Reference

All endpoints are under `/api`.

### `GET /api/certs`

Lists all certificates in the trust store.

**Response:**
```json
{
  "success": true,
  "certs": [
    {
      "id":       "signing",
      "subject":  "O = Friends of Justin, CN = Free2PA Dev Signing",
      "notAfter": "Feb 18 20:14:33 2029 GMT",
      "hasKey":   true
    }
  ]
}
```

`hasKey: true` means the matching `.key` file exists — this cert can be used for signing. A cert without a key can still be used for trust verification.

---

### `POST /api/certs/generate`

Generates a new ECDSA P-256 self-signed certificate and adds it to the trust store.

**Request body (JSON):**
```json
{
  "name":         "jkilroy — CSCE 4193",
  "org":          "Friends of Justin",
  "validityDays": 365
}
```

| Field | Required | Description |
|---|---|---|
| `name` | yes | Certificate Common Name. Also used to derive the file slug (`jkilroy-csce-4193.crt`). |
| `org` | no | Organization field. Defaults to `Friends of Justin`. |
| `validityDays` | no | Certificate lifetime. Clamped to 1–3650. Defaults to 365. |

**Response:**
```json
{
  "success": true,
  "cert": {
    "id":       "jkilroy-csce-4193",
    "subject":  "O = Friends of Justin, CN = jkilroy — CSCE 4193",
    "notAfter": "Feb 20 18:30:00 2027 GMT",
    "hasKey":   true
  }
}
```

---

### `POST /api/sign`

Signs a skill file and returns the sidecar manifest as a downloadable JSON file.

**Request:** `multipart/form-data`

| Field | Required | Description |
|---|---|---|
| `file` | yes | The skill file to sign (`.md`, `.txt`, etc.) |
| `certId` | no | ID of the signing cert to use (e.g., `jkilroy`). Defaults to `signing`. |
| `title` | no | `dc:title` in the claim |
| `actor` | no | Author name or handle |
| `course` | no | Course name/ID |
| `assignment` | no | Assignment name/ID |
| `repo` | no | Repository URL |
| `studentId` | no | Student or publisher ID |
| `instructor` | no | Instructor name |

**Response:** `application/json` with `Content-Disposition: attachment; filename="<name>.c2pa.json"`

The response body is the complete sidecar manifest.

---

### `POST /api/verify`

Verifies a skill file against its sidecar. Returns three independent verdicts.

**Request:** `multipart/form-data`

| Field | Required | Description |
|---|---|---|
| `file` | yes | The skill file |
| `sidecar` | yes | The `.c2pa.json` sidecar |
| `trustProfile` | no | `dev` (default), `org`, or `public` |
| `certId` | no | If provided, trust check is a strict match against this cert only |

**Response:**
```json
{
  "success":        true,
  "signatureValid": true,
  "signatureError": null,
  "hashMatch":      true,
  "trust": {
    "profile": "dev",
    "trusted": true,
    "label":   "Server/Dev",
    "detail":  "Cert is in this server's trust store (matched: signing)"
  },
  "claim":        { "..." : "..." },
  "spec_version": "free2pa/0.1.0"
}
```

---

### `GET /health`

```json
{ "status": "ok", "app": "Free2PA", "version": "0.1.0" }
```

---

## Project Structure

```
free2pa/
├── index.js                    Entry point
├── public/
│   └── index.html              Web UI (sign + verify panels)
├── src/
│   ├── server.js               Express app factory
│   ├── config.js               Environment-aware config
│   ├── routes/
│   │   ├── sign.js             POST /api/sign
│   │   ├── verify.js           POST /api/verify
│   │   └── certs.js            GET /api/certs, POST /api/certs/generate
│   ├── services/
│   │   ├── signer.js           Claim construction + ECDSA signing
│   │   └── verifier.js         Hash check + signature verify + trust check
│   └── utils/
│       └── canonical.js        Deterministic JSON for stable signing
└── certs/
    ├── generate-cert.sh        CLI cert generator (openssl wrapper)
    ├── signing.crt             Default cert (created by generate-cert)
    └── signing.key             Default private key (never commit this)
```

---

## Security Notes

**Private keys** (`*.key`) must never be committed to version control. Add `certs/*.key` to `.gitignore`. Only the `.crt` files need to be shared with verifiers.

**`certId` validation** — the sign and verify endpoints validate that `certId` contains only `[a-z0-9-]` characters before constructing file paths, preventing path traversal attacks.

**Self-signed certs** are sufficient for `Server/Dev` trust within a controlled deployment. For broader trust (org, public), replace them with certs issued by a shared CA or commercial PKI.

**The signature covers the claim only**, not the cert itself. The cert travels unsigned in the sidecar. In a full C2PA implementation, the cert chain would itself be verified against a root of trust. That is what the `Org` and `Public` profiles will implement.

---

## Roadmap: MCP Server Integration

The immediate next step for Free2PA is packaging the verification logic as an **MCP (Model Context Protocol) server**. This turns the verifier into a gatekeeper that sits between an agent runtime and its skill registry.

**Planned flow:**

```
Agent Runtime
    │
    │  "load skill: web-search.md"
    ▼
MCP Server (Free2PA)
    │
    ├─ fetch web-search.md + web-search.md.c2pa.json from registry
    ├─ POST /api/verify  →  { signatureValid, hashMatch, trust }
    │
    ├─ all three pass → skill is returned to agent
    └─ any fail       → MCP returns error; skill is not loaded
```

Key design decisions for the MCP phase:

- **Trust store management** stays filesystem-based — operators add/remove `.crt` files to control which publishers are trusted.
- **`Org` profile** will support a shared CA bundle so large teams can issue per-agent or per-role signing identities without coordinating individual certs across every MCP instance.
- **Audit log** — every verification event (skill ID, verdict, matched cert, timestamp) will be emitted so operators can trace exactly what ran.
- **Revocation** — removing a cert from `certs/` immediately revokes trust for any skill signed with it, without requiring sidecar updates.

The threat model this addresses: an attacker who gains write access to a skill registry can inject a malicious skill file. Without credential checking, the agent loads and executes it. With Free2PA MCP gating, the injected file either has no sidecar (rejected), a sidecar signed with an untrusted cert (rejected), or a valid sidecar whose hash no longer matches the tampered file (rejected).
