import { normalizeSeverity } from "../normalization.service.js";
import { redactSecrets } from "../../../utils/secret-redactor.js";

export const GITLEAKS_METADATA = {
  tool: "gitleaks",
  toolVersion: "gitleaks-v8.18.4",
  rulesetVersion: "gitleaks-rule-pack-v8",
  supportedLanguages: ["*"],
  exitCodeSemantics:
    "0: no leaks detected, 1: leaks found in source code, 2: scan error or invalid syntax",
  timeoutMs: 30000,
};

const SECRET_PATTERNS = [
  {
    ruleId: "gitleaks-aws-access-key",
    title: "AWS Access Key ID Detected",
    category: "secrets",
    severity: "critical",
    pattern: /\b(AKIA[0-9A-Z]{16,28})\b/g,
    message: "Potential hardcoded AWS Access Key ID detected. Rotate key immediately and inject via environment variables.",
    cwe: ["CWE-798"],
    owasp: ["A07:2021-Identification and Authentication Failures"],
    explanation: "AWS Access Keys grant API access to cloud infrastructure and should never be stored in source code.",
  },
  {
    ruleId: "gitleaks-github-pat",
    title: "GitHub Personal Access Token Detected",
    category: "secrets",
    severity: "critical",
    pattern: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{50,})\b/g,
    message: "GitHub authentication token exposed in source code. Revoke token and store in secrets manager.",
    cwe: ["CWE-798"],
    owasp: ["A07:2021-Identification and Authentication Failures"],
    explanation: "GitHub tokens grant repository and organization access and should be stored securely in secret stores.",
  },
  {
    ruleId: "gitleaks-private-key",
    title: "Unencrypted Private Key Block",
    category: "secrets",
    severity: "critical",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    message: "Private cryptographic key block committed to source repository. This can lead to system compromise.",
    cwe: ["CWE-798"],
    owasp: ["A07:2021-Identification and Authentication Failures"],
    explanation: "Private keys compromise TLS certificates, SSH credentials, and cryptographic signatures.",
  },
  {
    ruleId: "gitleaks-slack-token",
    title: "Slack Bot/User Token",
    category: "secrets",
    severity: "high",
    pattern: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b/g,
    message: "Slack API access token detected in source files. Invalidate token immediately.",
    cwe: ["CWE-798"],
    owasp: ["A07:2021-Identification and Authentication Failures"],
    explanation: "Slack tokens can allow unauthorized users to read workspace conversations and send messages.",
  },
  {
    ruleId: "gitleaks-stripe-key",
    title: "Stripe Live Secret Key",
    category: "secrets",
    severity: "critical",
    pattern: /\b((?:sk|rk)_live_[0-9a-zA-Z]{24,34})\b/g,
    message: "Live Stripe payment processor key detected in repository code.",
    cwe: ["CWE-798"],
    owasp: ["A07:2021-Identification and Authentication Failures"],
    explanation: "Live payment gateway keys can allow unauthorized credit card charges, refunds, and financial exfiltration.",
  },
  {
    ruleId: "gitleaks-db-credential-uri",
    title: "Database Connection String with Plaintext Credentials",
    category: "secrets",
    severity: "high",
    pattern: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql):\/\/[a-zA-Z0-9_\-]+:[^@\s\/]+@[a-zA-Z0-9.\-]+/gi,
    message: "Database connection string containing embedded plaintext username and password.",
    cwe: ["CWE-798"],
    owasp: ["A07:2021-Identification and Authentication Failures"],
    explanation: "Connection strings with embedded passwords expose database instances to unauthorized access.",
  },
];

export async function runSecretScanner({ files }) {
  const startTime = Date.now();
  const findings = [];
  const { toolVersion, rulesetVersion } = GITLEAKS_METADATA;

  try {
    for (const file of files) {
      const lines = file.content.split(/\r?\n/);
      lines.forEach((line, index) => {
        const lineNum = index + 1;

        for (const rule of SECRET_PATTERNS) {
          rule.pattern.lastIndex = 0;
          if (rule.pattern.test(line)) {
            const start = Math.max(0, index - 2);
            const end = Math.min(lines.length, index + 3);
            const rawSnippet = lines
              .slice(start, end)
              .map((l, i) => `${start + i + 1} | ${l}`)
              .join("\n");

            // Redact secrets immediately from snippet and anchor
            const sanitizedSnippet = redactSecrets(rawSnippet);
            const sanitizedAnchor = redactSecrets(line.trim());

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
              startColumn: 1,
              endColumn: line.length + 1,
              codeAnchor: sanitizedAnchor,
              codeSnippet: sanitizedSnippet,
              sanitizedSnippet,
              source: "static-analysis",
              toolName: "gitleaks",
              toolVersion,
              rulesetVersion,
              confidence: "high",
              cwe: rule.cwe,
              owasp: rule.owasp,
              ruleExplanation: rule.explanation,
              scannerEvidenceRef: `gitleaks:${rule.ruleId}:${file.path}:${lineNum}`,
              rawMetadata: {
                scannerVersion: toolVersion,
                rulesetVersion,
                secretDetected: true,
              },
            });
          }
        }
      });
    }

    return {
      scanner: "gitleaks",
      version: toolVersion,
      rulesetVersion,
      status: "completed",
      findings,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      scanner: "gitleaks",
      version: toolVersion,
      rulesetVersion,
      status: "failed",
      error: err.message,
      findings: [],
      durationMs: Date.now() - startTime,
    };
  }
}
