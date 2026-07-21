import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { loadVerifiedFile, verifyFileForLoad } from './loadGate.js';
import { DEFAULT_AUDIT_MODEL, getManagedIdentityAccessToken } from './services/auditor.js';

const POLICIES = new Set(['block', 'alert', 'log', 'repair']);
function outputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  throw new Error('The model did not return a greeting.');
}

export async function greetWithModel({
  soul,
  input = 'hello',
  temperature = 0.9,
  model = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.OPENAI_MODEL || DEFAULT_AUDIT_MODEL,
  azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT,
  azureApiKey = process.env.AZURE_OPENAI_API_KEY,
  apiKey = process.env.OPENAI_API_KEY,
  baseUrl = process.env.OPENAI_BASE_URL,
  tokenProvider = getManagedIdentityAccessToken,
  fetchImpl = globalThis.fetch,
} = {}) {
  const headers = { 'Content-Type': 'application/json' };
  let requestBaseUrl = baseUrl;
  let provider = 'openai-api-key';
  if (azureEndpoint) {
    requestBaseUrl ||= `${azureEndpoint.replace(/\/$/, '')}/openai/v1`;
    if (azureApiKey) {
      headers['api-key'] = azureApiKey;
      provider = 'azure-openai-api-key';
    } else {
      headers.Authorization = `Bearer ${await tokenProvider({ fetchImpl })}`;
      provider = 'azure-openai-managed-identity';
    }
  } else {
    requestBaseUrl ||= 'https://api.openai.com/v1';
    if (!apiKey) {
      const error = new Error('The Hello World agent needs an OpenAI or Azure OpenAI account.');
      error.code = 'MODEL_NOT_CONFIGURED';
      throw error;
    }
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetchImpl(`${requestBaseUrl.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      instructions: soul,
      input,
      text: {
        format: {
          type: 'json_schema',
          name: 'hello_world_agent_response',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['greeting'],
            properties: { greeting: { type: 'string' } },
          },
        },
      },
      temperature,
      max_output_tokens: 300,
    }),
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`.trim();
    try {
      const body = await response.json();
      detail = body.error?.message || detail;
    } catch {}
    throw new Error(`Hello World model request failed: ${detail}`);
  }
  const payload = JSON.parse(outputText(await response.json()));
  if (typeof payload.greeting !== 'string' || !/^Hello, [A-Za-z][A-Za-z -]{0,30} world!$/.test(payload.greeting)) {
    throw new Error('The model returned a greeting outside the agent contract.');
  }
  return {
    output: payload.greeting,
    provider,
    model,
  };
}

async function startAgent(soul, runModel) {
  const result = await runModel({
    soul,
    input: `hello\n\nrun_id=${randomUUID()}`,
  });
  return {
    name: 'Hello World Agent',
    started: true,
    input: 'hello',
    output: result.output,
    provider: result.provider ?? null,
    model: result.model ?? null,
  };
}

/** Deliberately unsafe comparison lane used only by the public demonstration. */
export async function runUnprotectedHelloWorldAgent({ assetPath, runModel = greetWithModel }) {
  const soul = await readFile(assetPath, 'utf8');
  return {
    action: 'RUN UNCHECKED',
    reasonCode: 'NOT_VERIFIED',
    agent: await startAgent(soul, runModel),
  };
}

function stoppedAgent() {
  return {
    name: 'Hello World Agent',
    started: false,
    input: 'hello',
    output: null,
    provider: null,
    model: null,
  };
}

function decodeSignedOriginal(report) {
  const encoded = report.verification?.claim?.asset?.content;
  const expectedHash = report.verification?.claim?.asset?.hash;
  if (typeof encoded !== 'string' || typeof expectedHash !== 'string') return null;
  const content = Buffer.from(encoded, 'base64').toString('utf8');
  const actualHash = createHash('sha256').update(content, 'utf8').digest('hex');
  return actualHash === expectedHash ? content : null;
}

/**
 * Minimal host integration: verify SOUL.md before it reaches the agent, then
 * apply an explicit fail policy. No model account is needed for this example.
 */
export async function runHelloWorldAgent({
  assetPath,
  sidecarPath,
  trustStore,
  trustCert,
  policy = 'block',
  runModel = greetWithModel,
}) {
  if (!POLICIES.has(policy)) throw new TypeError(`Unsupported host policy: ${policy}`);

  if (policy === 'block') {
    try {
      const verifiedPolicy = await loadVerifiedFile({
        assetPath,
        sidecarPath,
        trustStore,
        trustCert,
      });
      return {
        action: 'LOAD',
        reasonCode: 'VERIFIED',
        agent: await startAgent(verifiedPolicy, runModel),
        gate: await verifyFileForLoad({ assetPath, sidecarPath, trustStore, trustCert }),
      };
    } catch (error) {
      if (error.name !== 'Free2PALoadError') throw error;
      return {
        action: error.code === 'CONTENT_CHANGED' ? 'QUARANTINE' : 'REJECT',
        reasonCode: error.code,
        agent: stoppedAgent(),
        gate: error.report,
      };
    }
  }

  const gate = await verifyFileForLoad({ assetPath, sidecarPath, trustStore, trustCert });
  if (gate.decision === 'LOAD') {
    return {
      action: 'LOAD',
      reasonCode: gate.reasonCode,
      agent: await startAgent(gate.content, runModel),
      gate,
    };
  }

  if (policy === 'repair') {
    const repairable = gate.reasonCode === 'CONTENT_CHANGED'
      && gate.verification?.signatureValid === true
      && gate.verification?.certificate?.valid === true
      && gate.verification?.trust?.trusted === true;
    const signedOriginal = repairable ? decodeSignedOriginal(gate) : null;
    if (signedOriginal) {
      return {
        action: 'RESTORE + RUN + REPORT',
        reasonCode: gate.reasonCode,
        agent: await startAgent(signedOriginal, runModel),
        gate,
      };
    }
    return {
      action: 'STOP + REPORT',
      reasonCode: gate.reasonCode,
      agent: stoppedAgent(),
      gate,
    };
  }

  const unverifiedPolicy = await readFile(assetPath, 'utf8');
  return {
    action: policy === 'alert' ? 'ALERT + CONTINUE' : 'LOG + CONTINUE',
    reasonCode: gate.reasonCode,
    agent: await startAgent(unverifiedPolicy, runModel),
    gate,
  };
}
