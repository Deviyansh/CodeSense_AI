/**
 * Redaction utility to ensure raw secrets and credentials never leak
 * into logs, finding snippets, reports, or external AI model prompts.
 */

const REDACTION_PATTERNS = [
  // AWS Access Key ID
  {
    regex: /\b(AKIA[0-9A-Z]{16,28})\b/g,
    replace: (match) => match.slice(0, 4) + "****************",
  },
  // GitHub PAT
  {
    regex: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{50,})\b/g,
    replace: (match) => match.slice(0, 7) + "********************",
  },
  // Slack Bot/User Token
  {
    regex: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b/g,
    replace: (match) => match.slice(0, 5) + "****************",
  },
  // Stripe Live Secret Key
  {
    regex: /\b((?:sk|rk)_live_[0-9a-zA-Z]{24,34})\b/g,
    replace: (match) => match.slice(0, 8) + "****************",
  },
  // Private Key Blocks
  {
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    replace: () => "[REDACTED_PRIVATE_KEY_BLOCK]",
  },
  // Database connection strings with embedded plaintext passwords
  {
    regex: /((?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql):\/\/[^:\s\/]+:)([^@\s\/]+)(@[a-zA-Z0-9.\-]+)/gi,
    replace: (_match, prefix, _pass, suffix) => `${prefix}********${suffix}`,
  },
];

/**
 * Redact sensitive secrets from any text string.
 */
export function redactSecrets(text) {
  if (!text || typeof text !== "string") return text;
  let sanitized = text;
  for (const { regex, replace } of REDACTION_PATTERNS) {
    sanitized = sanitized.replace(regex, replace);
  }
  return sanitized;
}

/**
 * Recursively redact secrets from an object or array.
 */
export function redactObjectSecrets(obj) {
  if (!obj || typeof obj !== "object") {
    return typeof obj === "string" ? redactSecrets(obj) : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(redactObjectSecrets);
  }
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    // Redact password or secret fields directly if present
    if (/password|secret|token|apikey|authorization/i.test(key) && typeof val === "string") {
      result[key] = "[REDACTED]";
    } else {
      result[key] = redactObjectSecrets(val);
    }
  }
  return result;
}
