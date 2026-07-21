import { pathToFileURL } from 'node:url';
import { createServer } from './src/server.js';
import { config } from './src/config.js';
export { createServer } from './src/server.js';
export {
  Free2PALoadError,
  loadVerifiedFile,
  verifyFileForLoad,
} from './src/loadGate.js';
export { signSkill } from './src/services/signer.js';
export { verifySkill } from './src/services/verifier.js';
export {
  addTrustedCertificate,
  generateSigningCertificate,
  listTrustedCertificates,
  removeTrustedCertificate,
} from './src/services/certificates.js';

async function startServer() {
  const app = await createServer();

  app.listen(config.port, () => {
    console.log(`\nFree2PA ${config.appVersion} - http://localhost:${config.port}`);
    console.log(`  POST /api/sign    sign a skill.md → downloads .c2pa.json sidecar`);
    console.log(`  POST /api/verify  verify skill.md + sidecar\n`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await startServer();
}
