// Redact sensitive keys from logged objects
const SENSITIVE_PATTERNS = [/password/i, /token/i, /secret/i, /key/i, /authorization/i];

function sanitize(data) {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(sanitize);

  const clean = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_PATTERNS.some((p) => p.test(k))) {
      clean[k] = "[REDACTED]";
    } else if (typeof v === "object" && v !== null) {
      clean[k] = sanitize(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export const logger = {
  info(event, payload = {}) {
    const entry = {
      level: "info",
      time: new Date().toISOString(),
      event,
      ...sanitize(payload),
    };
    console.log(JSON.stringify(entry));
  },
  warn(event, payload = {}) {
    const entry = {
      level: "warn",
      time: new Date().toISOString(),
      event,
      ...sanitize(payload),
    };
    console.warn(JSON.stringify(entry));
  },
  error(event, payload = {}) {
    const entry = {
      level: "error",
      time: new Date().toISOString(),
      event,
      ...sanitize(payload),
    };
    console.error(JSON.stringify(entry));
  },
};
