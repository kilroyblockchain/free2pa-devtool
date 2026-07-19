import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runHelloWorldAgent } from '../../src/helloAgent.js';

const here = dirname(fileURLToPath(import.meta.url));
const demoRoot = resolve(here, '..', '..', 'public', 'demo', 'hello-agent');
const scenario = process.argv[2] ?? 'trusted';
const policy = process.argv[3] ?? 'block';

const result = await runHelloWorldAgent({
  assetPath: resolve(demoRoot, scenario, 'SOUL.md'),
  trustStore: resolve(demoRoot, 'trusted-publishers'),
  policy,
});

console.log(JSON.stringify({
  gate: result.gate.decision,
  reason: result.reasonCode,
  action: result.action,
  agent_started: result.agent.started,
  agent_output: result.agent.output,
}, null, 2));

if (!result.agent.started) process.exitCode = 1;
