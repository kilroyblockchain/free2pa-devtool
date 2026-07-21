import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runHelloWorldAgent } from '../../src/helloAgent.js';

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = resolve(here, '..', '..', 'public', 'demo', 'hello-agent');
const arguments_ = process.argv.slice(2);
const fakeModel = arguments_.includes('--fake-model');
const positional = arguments_.filter((value) => value !== '--fake-model');
const scenario = positional[0] ?? 'trusted';
const policy = positional[1] ?? 'block';

const runModel = fakeModel
  ? async ({ soul }) => ({
    output: /^- Always use a bitter, hostile, pessimistic, or ambiguous adjective\./m.test(soul)
      ? 'Hello, dreary world!'
      : 'Hello, bright world!',
    provider: 'fake-model',
    model: 'deterministic-hello',
  })
  : undefined;

const result = await runHelloWorldAgent({
  assetPath: resolve(demoRoot, scenario, 'SOUL.md'),
  trustStore: resolve(demoRoot, 'trusted-publishers'),
  policy,
  ...(runModel ? { runModel } : {}),
});

console.log(JSON.stringify({
  gate: result.gate.decision,
  reason: result.reasonCode,
  action: result.action,
  agent_started: result.agent.started,
  agent_output: result.agent.output,
  model: result.agent.model,
}, null, 2));

if (!result.agent.started) process.exitCode = 1;
