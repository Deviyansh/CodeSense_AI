import { normalizeSeverity } from "../normalization.service.js";

const SECURITY_PATTERNS = [
  {
    ruleId: "sec-sql-injection",
    title: "SQL Injection via Concatenation / Interpolation",
    category: "security",
    severity: "critical",
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s+.*(?:\+\s*req\.|\$\{\s*req\.)/i,
    message: "Dynamic SQL query formed by string concatenation or template literal with user input. Use parameterized queries or ORM binds.",
  },
  {
    ruleId: "sec-command-injection",
    title: "Command Injection via child_process.exec",
    category: "security",
    severity: "critical",
    pattern: /(?:child_process|exec|execSync)\s*\(\s*(?:`.*?\$\{.*?\}`|.*?\+.*?req\.)/g,
    message: "Untrusted string interpolated into shell execution command. Use execFile or spawn with argument arrays without a shell.",
  },
  {
    ruleId: "sec-path-traversal",
    title: "Arbitrary File Access / Path Traversal",
    category: "security",
    severity: "high",
    pattern: /(?:fs\.readFile|fs\.readFileSync|fs\.createReadStream|res\.sendFile)\s*\(\s*(?:req\.|path\.join\(.*req\.)/g,
    message: "Directly passing request parameters to filesystem APIs without path normalization and workspace boundary validation.",
  },
  {
    ruleId: "sec-hardcoded-jwt-secret",
    title: "Hardcoded Secret in JWT Sign/Verify",
    category: "security",
    severity: "high",
    pattern: /jwt\.(?:sign|verify)\s*\([^,]+,\s*["'`](?!process\.env)[a-zA-Z0-9_\-!@#\$%\^&\*]{1,30}["'`]/g,
    message: "Hardcoded secret key detected in JWT signing/verification. Store secrets in environment variables and rotate them.",
  },
  {
    ruleId: "sec-insecure-crypto-hash",
    title: "Weak Cryptographic Hash Function (MD5/SHA1)",
    category: "security",
    severity: "medium",
    pattern: /crypto\.createHash\s*\(\s*["'`](?:md5|sha1)["'`]\s*\)/gi,
    message: "MD5 and SHA-1 have known collision vulnerabilities. Use SHA-256 or Argon2/bcrypt for sensitive data.",
  },
  {
    ruleId: "sec-disabled-tls-verification",
    title: "TLS Certificate Verification Disabled",
    category: "security",
    severity: "high",
    pattern: /(?:rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"])/g,
    message: "Disabling TLS certificate validation exposes network traffic to Man-in-the-Middle (MitM) attacks.",
  },
  {
    ruleId: "sec-prototype-pollution",
    title: "Potential Prototype Pollution via Unsanitized Object Merge",
    category: "security",
    severity: "high",
    pattern: /Object\.assign\s*\(\s*\{\}\s*,\s*req\.body\b/g,
    message: "Directly merging untrusted user request bodies into objects without sanitizing __proto__ or constructor keys.",
  },
  {
    ruleId: "sec-overly-permissive-cors",
    title: "Insecure CORS Policy with Wildcard",
    category: "security",
    severity: "medium",
    pattern: /cors\s*\(\s*\{\s*origin\s*:\s*["'`]\*["'`]/g,
    message: "CORS configured with wildcard '*' origin. Restrict origins to explicitly trusted application domains.",
  },
];

export async function runSecurityScanner({ files }) {
  const findings = [];
  const version = "semgrep-rules-v2.4";

  for (const file of files) {
    if (!file.path.endsWith(".js") && !file.path.endsWith(".jsx") && !file.path.endsWith(".ts") && !file.path.endsWith(".tsx")) {
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
          const snippet = lines.slice(start, end).map((l, i) => `${start + i + 1} | ${l}`).join("\n");

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
            codeAnchor: line.trim(),
            codeSnippet: snippet,
            source: "static-analysis",
            rawMetadata: {
              scannerVersion: version,
              matchSnippet: line.trim(),
            },
          });
        }
      }
    });
  }

  return {
    scanner: "semgrep-security",
    version,
    rulesetVersion: "2.4.0",
    findings,
  };
}
