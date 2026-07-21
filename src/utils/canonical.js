/**
 * Deterministic JSON serialization with recursively sorted object keys.
 * Used to produce a stable byte string for signing and verification.
 */
export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',') + '}';
  }
  return JSON.stringify(value);
}
