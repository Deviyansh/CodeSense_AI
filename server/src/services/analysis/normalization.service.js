import crypto from "crypto";
import { redactSecrets } from "../../utils/secret-redactor.js";

// Severity vocabularies mapped to standard platform levels
const SEVERITY_MAP = {
  critical: "critical",
  blocker: "critical",
  high: "high",
  error: "high",
  medium: "medium",
  warn: "medium",
  warning: "medium",
  low: "low",
  minor: "low",
  info: "info",
  informational: "info",
  unknown: "unknown",
};

export function normalizeSeverity(scannerSeverity) {
  if (!scannerSeverity) return "unknown";
  const normalized = scannerSeverity.toLowerCase();
  return SEVERITY_MAP[normalized] || "unknown";
}

/**
 * Generate stable fingerprint across commit movements:
 * fingerprint = hash(scannerName + "|" + ruleId + "|" + normalizedRepositoryPath + "|" + normalizedCodeAnchor)
 */
export function generateFingerprint({ scanner, ruleId, filePath, codeAnchor }) {
  const normPath = (filePath || "").replace(/\\/g, "/").toLowerCase();
  const normAnchor = (codeAnchor || "").trim().slice(0, 120);
  const rawKey = `${scanner}|${ruleId}|${normPath}|${normAnchor}`;
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Repository-level stable key that persists across lines and code shifts.
 */
export function generateStableKey({ ruleId, filePath, category }) {
  const normPath = (filePath || "").replace(/\\/g, "/").toLowerCase();
  const rawKey = `${ruleId}|${normPath}|${category || ""}`;
  return crypto.createHash("sha256").update(rawKey).digest("hex").slice(0, 16);
}

export function deduplicateFindings(findings) {
  const seen = new Set();
  const deduped = [];

  for (const item of findings) {
    // Redact any secrets in snippet and code anchor
    if (item.codeSnippet) {
      item.codeSnippet = redactSecrets(item.codeSnippet);
      item.sanitizedSnippet = item.codeSnippet;
    }
    if (item.codeAnchor) {
      item.codeAnchor = redactSecrets(item.codeAnchor);
    }
    if (item.message) {
      item.message = redactSecrets(item.message);
    }

    if (!item.fingerprint) {
      item.fingerprint = generateFingerprint(item);
    }
    if (!item.stableKey) {
      item.stableKey = generateStableKey(item);
    }

    if (!seen.has(item.fingerprint)) {
      seen.add(item.fingerprint);
      deduped.push({
        ...item,
        status: item.status || "OPEN",
        state: item.state || "open",
        fingerprintVersion: "v1",
      });
    }
  }

  return deduped;
}

export function computeSummary(findings) {
  const summary = {
    total: findings.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const f of findings) {
    if (summary[f.severity] !== undefined) {
      summary[f.severity]++;
    }
  }

  return summary;
}
