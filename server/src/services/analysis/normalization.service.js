import crypto from "crypto";

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
  const normPath = filePath.replace(/\\/g, "/").toLowerCase();
  const normAnchor = (codeAnchor || "").trim().slice(0, 120);
  const rawKey = `${scanner}|${ruleId}|${normPath}|${normAnchor}`;
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function deduplicateFindings(findings) {
  const seen = new Set();
  const deduped = [];

  for (const item of findings) {
    if (!item.fingerprint) {
      item.fingerprint = generateFingerprint(item);
    }
    if (!seen.has(item.fingerprint)) {
      seen.add(item.fingerprint);
      deduped.push(item);
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
