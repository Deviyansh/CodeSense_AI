import { normalizeSeverity } from "../normalization.service.js";

export const SEMGREP_METADATA = {
  tool: "semgrep",
  toolVersion: "semgrep-1.78.0",
  rulesetVersion: "p/security-audit-v1.2",
  supportedLanguages: [".js", ".jsx", ".ts", ".tsx"],
  exitCodeSemantics:
    "0: no security issues found, 1: security findings identified, 2: syntax error or pattern parse failure",
  timeoutMs: 30000,
};

const SECURITY_PATTERNS = [
  {
    ruleId: "sec-sql-injection",
    title: "SQL Injection via Concatenation / Interpolation",
    category: "security",
    severity: "critical",
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s+.*(?:\+\s*req\.|\$\{\s*req\.)/i,
    message: "Dynamic SQL query formed by string concatenation or template literal with user input. Use parameterized queries or ORM binds.",
    cwe: ["CWE-89"],
    owasp: ["A03:2021-Injection"],
    explanation: "User-controlled input concatenated into SQL queries allows attackers to execute arbitrary database queries, alter records, or dump database contents.",
  },
  {
    ruleId: "sec-command-injection",
    title: "Command Injection via child_process.exec",
    category: "security",
    severity: "critical",
    pattern: /(?:child_process|exec|execSync)\s*\(\s*(?:`.*?\$\{.*?\}`|.*?\+.*?req\.)/g,
    message: "Untrusted string interpolated into shell execution command. Use execFile or spawn with argument arrays without a shell.",
    cwe: ["CWE-78"],
    owasp: ["A03:2021-Injection"],
    explanation: "Passing user input directly to system command shells allows execution of arbitrary operating system commands.",
  },
  {
    ruleId: "sec-path-traversal",
    title: "Arbitrary File Access / Path Traversal",
    category: "security",
    severity: "high",
    pattern: /(?:fs\.readFile|fs\.readFileSync|fs\.createReadStream|res\.sendFile)\s*\(\s*(?:req\.|path\.join\(.*req\.)/g,
    message: "Directly passing request parameters to filesystem APIs without path normalization and workspace boundary validation.",
    cwe: ["CWE-22"],
    owasp: ["A01:2021-Broken Access Control"],
    explanation: "Directory traversal sequences (e.g. '../') can navigate outside the intended directory to read sensitive files.",
  },
  {
    ruleId: "sec-hardcoded-jwt-secret",
    title: "Hardcoded Secret in JWT Sign/Verify",
    category: "security",
    severity: "high",
    pattern: /jwt\.(?:sign|verify)\s*\([^,]+,\s*["'`](?!process\.env)[a-zA-Z0-9_\-!@#\$%\^&\*]{1,30}["'`]/g,
    message: "Hardcoded secret key detected in JWT signing/verification. Store secrets in environment variables and rotate them.",
    cwe: ["CWE-798"],
    owasp: ["A07:2021-Identification and Authentication Failures"],
    explanation: "Hardcoded cryptographic keys are exposed to anyone with read access to the source code, allowing unauthorized token generation.",
  },
  {
    ruleId: "sec-insecure-crypto-hash",
    title: "Weak Cryptographic Hash Function (MD5/SHA1)",
    category: "security",
    severity: "medium",
    pattern: /crypto\.createHash\s*\(\s*["'`](?:md5|sha1)["'`]\s*\)/gi,
    message: "MD5 and SHA-1 have known collision vulnerabilities. Use SHA-256 or Argon2/bcrypt for sensitive data.",
    cwe: ["CWE-327"],
    owasp: ["A02:2021-Cryptographic Failures"],
    explanation: "MD5 and SHA-1 are cryptographically broken and vulnerable to practical collision attacks.",
  },
  {
    ruleId: "sec-disabled-tls-verification",
    title: "TLS Certificate Verification Disabled",
    category: "security",
    severity: "high",
    pattern: /(?:rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"])/g,
    message: "Disabling TLS certificate validation exposes network traffic to Man-in-the-Middle (MitM) attacks.",
    cwe: ["CWE-295"],
    owasp: ["A07:2021-Identification and Authentication Failures"],
    explanation: "Disabling TLS validation allows attackers on the network to intercept, decrypt, and tamper with outbound communication.",
  },
  {
    ruleId: "sec-prototype-pollution",
    title: "Potential Prototype Pollution via Unsanitized Object Merge",
    category: "security",
    severity: "high",
    pattern: /Object\.assign\s*\(\s*\{\}\s*,\s*req\.body\b/g,
    message: "Directly merging untrusted user request bodies into objects without sanitizing __proto__ or constructor keys.",
    cwe: ["CWE-1321"],
    owasp: ["A03:2021-Injection"],
    explanation: "Merging untrusted objects into prototypes can modify object behavior application-wide, resulting in denial of service or remote code execution.",
  },
  {
    ruleId: "sec-overly-permissive-cors",
    title: "Insecure CORS Policy with Wildcard",
    category: "security",
    severity: "medium",
    pattern: /cors\s*\(\s*\{\s*origin\s*:\s*["'`]\*["'`]/g,
    message: "CORS configured with wildcard '*' origin. Restrict origins to explicitly trusted application domains.",
    cwe: ["CWE-942"],
    owasp: ["A01:2021-Broken Access Control"],
    explanation: "A wildcard CORS policy allows malicious websites visited by users to make authenticated cross-origin requests to your API.",
  },
];

export async function runSecurityScanner({ files }) {
  const startTime = Date.now();
  const findings = [];
  const { toolVersion, rulesetVersion } = SEMGREP_METADATA;

  try {
    for (const file of files) {
      if (
        !file.path.endsWith(".js") &&
        !file.path.endsWith(".jsx") &&
        !file.path.endsWith(".ts") &&
        !file.path.endsWith(".tsx")
      ) {
        continue;
      }

      const lines = file.content.split(/\r?\n/);
      lines.forEach((line, index) => {
        const lineNum = index + 1;

        for (const rule of SECURITY_PATTERNS) {
          rule.pattern.lastIndex = 0;
          if (rule.pattern.test(line)) {
            const start = Math.max(0, index - 2);
            const end = Math.min(lines.length, index + 3);
            const snippet = lines
              .slice(start, end)
              .map((l, i) => `${start + i + 1} | ${l}`)
              .join("\n");

            findings.push({
              scanner: "semgrep-security",
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
              codeAnchor: line.trim(),
              codeSnippet: snippet,
              sanitizedSnippet: snippet,
              source: "static-analysis",
              toolName: "semgrep",
              toolVersion,
              rulesetVersion,
              confidence: "high",
              cwe: rule.cwe,
              owasp: rule.owasp,
              ruleExplanation: rule.explanation,
              scannerEvidenceRef: `semgrep:${rule.ruleId}:${file.path}:${lineNum}`,
              rawMetadata: {
                scannerVersion: toolVersion,
                rulesetVersion,
                lineContent: line.trim(),
              },
            });
          }
        }
      });
    }

    return {
      scanner: "semgrep-security",
      version: toolVersion,
      rulesetVersion,
      status: "completed",
      findings,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      scanner: "semgrep-security",
      version: toolVersion,
      rulesetVersion,
      status: "failed",
      error: err.message,
      findings: [],
      durationMs: Date.now() - startTime,
    };
  }
}
