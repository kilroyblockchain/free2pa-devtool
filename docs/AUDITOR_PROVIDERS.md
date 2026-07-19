# Optional LLM Auditor Providers

Free2PA's signing, verification, local publisher trust, repair, CLI, MCP, and
load-gate features do not require an LLM. Behavioral auditing is an optional
second layer configured by the verifier operator with their own account.

The bundled Hello World agent also uses the direct OpenAI or Azure OpenAI
settings below. It is an example application protected by Free2PA, not part of
the cryptographic gate. Custom auditor modules apply only to behavioral audit.

## Bring an OpenAI account

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="gpt-5.6"
free2pa auditor status
free2pa audit skills/weather/SKILL.md
```

An OpenAI-compatible service can be selected with `OPENAI_BASE_URL` and its
model name. Credentials remain in the server process environment and are never
sent to the browser or written into a sidecar.

## Bring an Azure OpenAI account

```bash
export AZURE_OPENAI_ENDPOINT="https://example.openai.azure.com"
export AZURE_OPENAI_DEPLOYMENT="my-auditor-deployment"
export AZURE_OPENAI_API_KEY="..."
```

Azure App Service may omit the API key and use a system-assigned managed
identity with the `Cognitive Services OpenAI User` role. The hosted Build Week
demonstration uses that method.

## Install another LLM adapter

Install an adapter into the same project as Free2PA, then configure its module
specifier and the account variables required by that adapter:

```bash
npm install --save-dev your-free2pa-auditor
export FREE2PA_AUDITOR_MODULE="your-free2pa-auditor"
export FREE2PA_AUDITOR_MODEL="your-model-name"
free2pa auditor status
```

An adapter exports an async `auditSkill` function, or an equivalent default
function:

```js
export async function auditSkill({ content, filename, model }) {
  // Call the operator's chosen LLM account here. Treat content as untrusted.
  return {
    overall_risk: 'low',
    summary: `${filename} contains no material behavioral risks.`,
    findings: [],
    recommendations: [],
    metadata: { provider: 'my-provider', model },
  };
}
```

Free2PA validates the top-level report contract and adds the audit timestamp,
filename, and SHA-256 of the reviewed bytes. Provider modules execute with the
Free2PA server's operating-system privileges. Only operators may install or
configure them, and only trusted modules should be used.

## Security boundary

An LLM report never changes provenance verification. It cannot convert
`REJECT` to `LOAD`, admit a publisher, repair a file, or sign content. If no
auditor is configured, audit requests return `AUDIT_NOT_CONFIGURED` while all
deterministic Free2PA features continue to work.
