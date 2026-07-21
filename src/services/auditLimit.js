import { config } from '../config.js';

const usage = new Map();
const HOUR_MS = 60 * 60 * 1000;

function currentBucket(key, now) {
  const bucket = usage.get(key);
  if (!bucket || now < bucket.startedAt || now - bucket.startedAt >= HOUR_MS) {
    return { startedAt: now, count: 0 };
  }
  return bucket;
}

export function consumeAuditAllowance(clientId = 'unknown', now = Date.now()) {
  const clientKey = `client:${clientId}`;
  const globalKey = 'global';
  const client = currentBucket(clientKey, now);
  const global = currentBucket(globalKey, now);
  if (client.count >= config.auditRequestsPerHour ||
      global.count >= config.auditGlobalRequestsPerHour) {
    return false;
  }
  client.count += 1;
  global.count += 1;
  usage.set(clientKey, client);
  usage.set(globalKey, global);
  return true;
}
