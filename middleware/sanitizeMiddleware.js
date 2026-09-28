/**
 * SANITIZATION SAFEGUARDS
 * 1. Strips Mongo query operators ($ne, $gt, ...) to block NoSQL injection.
 * 2. Trims strings and removes HTML tags to block XSS payloads.
 * 3. Normalises object keys starting with "$" or containing "." away.
 */
const BLOCKED_OPERATORS = ['$where', '$regex', '$expr', '$function'];

const stripTags = (value) =>
  value
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();

const sanitiseString = (value) => {
  let out = value;
  BLOCKED_OPERATORS.forEach((op) => {
    out = out.split(op).join('');
  });
  return stripTags(out);
};

const sanitiseValue = (value, depth = 0) => {
  if (depth > 5) return null;

  if (typeof value === 'string') return sanitiseString(value);
  if (typeof value !== 'object' || value === null) return value;

  if (Array.isArray(value)) {
    return value.map((v) => sanitiseValue(v, depth + 1)).slice(0, 100);
  }

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (BLOCKED_OPERATORS.includes(key)) continue;
    if (key.startsWith('$') || key.includes('.')) continue;
    out[sanitiseString(key)] = sanitiseValue(val, depth + 1);
  }
  return out;
};

const sanitizeRequest = (req, res, next) => {
  if (req.body && typeof req.body === 'object') req.body = sanitiseValue(req.body);
  if (req.params && typeof req.params === 'object') req.params = sanitiseValue(req.params);
  if (req.query) req.query = sanitiseValue(req.query);
  next();
};

module.exports = sanitizeRequest;
