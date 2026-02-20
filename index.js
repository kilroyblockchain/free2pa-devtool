import { createServer } from './src/server.js';
import { config } from './src/config.js';

const app = await createServer();

app.listen(config.port, () => {
  console.log(`\nFree2PA v0.1.0  —  http://localhost:${config.port}`);
  console.log(`  POST /api/sign    sign a skill.md → downloads .c2pa.json sidecar`);
  console.log(`  POST /api/verify  verify skill.md + sidecar\n`);
});
