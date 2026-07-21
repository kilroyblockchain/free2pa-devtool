import { loadVerifiedFile } from 'free2pa/load-gate';

const policy = await loadVerifiedFile({
  assetPath: process.env.AGENT_POLICY ?? 'agent/SOUL.md',
  trustStore: process.env.FREE2PA_TRUST_STORE ?? '.free2pa/trusted-publishers',
});

// Only verified content reaches the harness. Replace this with its real start call.
startAgent({ systemInstructions: policy });

function startAgent({ systemInstructions }) {
  console.log(`Verified ${systemInstructions.length} bytes; starting agent.`);
}
