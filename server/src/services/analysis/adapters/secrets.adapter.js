import { normalizeSeverity } from "../normalization.service.js";

const SECRET_PATTERNS = [
  {
    ruleId: "gitleaks-aws-access-key",
    title: "AWS Access Key ID Detected",
    category: "secrets",
    severity: "critical",
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    message: "Potential hardcoded AWS Access Key ID detected. Rotate key immediately and inject via environment variables.",
  },
  {
    ruleId: "gitleaks-github-pat",
    title: "GitHub Personal Access Token Detected",
    category: "secrets",
    severity: "critical",
    pattern: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{50,})\b/g,
    message: "GitHub authentication token exposed in source code. Revoke token and store in secrets manager.",
  },
  {
    ruleId: "gitleaks-private-key",
    title: "Unencrypted Private Key Block",
    category: "secrets",
    severity: "critical",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    message: "Private cryptographic key block committed to source repository. This can lead to system compromise.",
  },
  {
    ruleId: "gitleaks-slack-token",
    title: "Slack Bot/User Token",
    category: "secrets",
    severity: "high",
    pattern: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b/g,
    message: "Slack API access token detected in source files. Invalidate token immediately.",
  },
  {
    ruleId: "gitleaks-stripe-key",
    title: "Stripe Live Secret Key",
    category: "secrets",
    severity: "critical",
    pattern: /\b((?:sk|rk)_live_[0-9a-zA-Z]{24,34})\b/g,
    message: "Live Stripe payment processor key detected in repository code.",
  },
  {
    ruleId: "gitleaks-db-credential-uri",
    title: "Database Connection String with Plaintext Credentials",
    category: "secrets",
    severity: "high",
    pattern: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql):\/\/[a-zA-Z0-9_\-]+:[^@\s\/]+@[a-zA-Z0-9.\-]+/gi,
    message: "Database connection string containing embedded plaintext username and password.",
  },
];

export async function runSecretScanner({ files }) {
  const findings = [];
  const version = "gitleaks-v8.18.2";

  for (const file of files) {
    // Avoid scanning test fixture mock tokens in test runners if needed, but flag them in fixture repositories
    const lines = file.content.split(/\r?\n/);
    lines.forEach((line, index) => {
      const lineNum = index + 1;

      for (const rule of SECRET_PATTERNS) {
        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(line)) {
          const start = Math.max(0, index - 2);
          const end = Math.min(lines.length, index + 3);
          const snippet = lines.slice(start, end).map((l, i) => `${start + i + 1} | ${l}`).join("\n");

          findings.push({
            scanner: "gitleaks",
            ruleId: rule.ruleId,
            title: rule.title,
            message: rule.message,
            severity: normalizeSeverity(rule.severity),
            category: rule.category,
            filePath: file.path,
            startLine: lineNum,
            endLine: lineNum,
            codeAnchor: line.trim(),
            codeSnippet: snippet,
            source: "static-analysis",
            rawMetadata: {
              scannerVersion: version,
            },
          });
        }
      }
    });
  }

  return {
    scanner: "gitleaks",
    version,
    rulesetVersion: "8.18.2",
    findings,
  };
}
