import { normalizeSeverity } from "../normalization.service.js";

export const ESLINT_METADATA = {
  tool: "eslint",
  toolVersion: "8.57.0",
  rulesetVersion: "8.57.0-recommended",
  supportedLanguages: [".js", ".jsx", ".ts", ".tsx"],
  exitCodeSemantics:
    "0: clean/no violations, 1: lint/quality violations detected, 2: syntax or internal configuration failure",
  timeoutMs: 30000,
};

const ESLINT_RULES = [
  {
    ruleId: "no-eval",
    title: "Disallow use of eval()",
    category: "security",
    severity: "critical",
    pattern: /\beval\s*\(/g,
    message: "eval() can lead to arbitrary code execution and injection vulnerabilities.",
    cwe: ["CWE-95"],
    owasp: ["A03:2021-Injection"],
    explanation: "Executing code with eval() bypasses language security controls and can permit remote code execution if input is tainted.",
  },
  {
    ruleId: "no-implied-eval",
    title: "Disallow implied eval via setTimeout / setInterval / Function",
    category: "security",
    severity: "high",
    pattern: /(?:setTimeout|setInterval)\s*\(\s*["'`]|new\s+Function\s*\(/g,
    message: "Passing strings to setTimeout/setInterval or new Function acts as an implied eval.",
    cwe: ["CWE-95"],
    owasp: ["A03:2021-Injection"],
    explanation: "Implied eval through string timers executes arbitrary strings in the global scope.",
  },
  {
    ruleId: "eqeqeq",
    title: "Require === and !== over == and !=",
    category: "correctness",
    severity: "medium",
    customCheck: (line) => {
      // Look for == or != without being === or !==
      return (
        /(?:[\w\s)\]])\s*(?:==|!=)\s*(?:[\w\s([{])/g.test(line) &&
        !/(?:===|!==)/.test(line)
      );
    },
    message: "Expected '===' or '!==' and instead saw '==' or '!=' which performs loose type coercion.",
    cwe: ["CWE-697"],
    owasp: ["A04:2021-Insecure Design"],
    explanation: "Type coercion with == and != can cause unexpected equality matches that lead to security bypasses.",
  },
  {
    ruleId: "no-debugger",
    title: "Disallow debugger statements",
    category: "quality",
    severity: "medium",
    pattern: /\bdebugger\b;?/g,
    message: "Production code should not contain debugger statements.",
    cwe: ["CWE-215"],
    owasp: ["A05:2021-Security Misconfiguration"],
    explanation: "Debugger statements halt execution in browser/server environments and leak stack context.",
  },
  {
    ruleId: "no-var",
    title: "Require let or const instead of var",
    category: "quality",
    severity: "low",
    pattern: /\bvar\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    message: "Unexpected var, use let or const instead to ensure block scoping.",
    cwe: ["CWE-398"],
    owasp: ["A04:2021-Insecure Design"],
    explanation: "var variables are function-scoped rather than block-scoped, often leading to accidental variable shadowing and hoisting bugs.",
  },
  {
    ruleId: "no-alert",
    title: "Disallow the use of alert, confirm, and prompt",
    category: "quality",
    severity: "low",
    pattern: /\b(?:alert|confirm|prompt)\s*\(/g,
    message: "Unexpected alert/confirm/prompt statement in application code.",
    cwe: ["CWE-398"],
    owasp: ["A04:2021-Insecure Design"],
    explanation: "UI dialog alerts block user interaction and indicate incomplete debugging or unfinished code.",
  },
];

export async function runESLintScanner({ files }) {
  const startTime = Date.now();
  const findings = [];
  const { toolVersion, rulesetVersion } = ESLINT_METADATA;

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

        for (const rule of ESLINT_RULES) {
          let matched = false;
          if (rule.customCheck) {
            matched = rule.customCheck(line);
          } else if (rule.pattern) {
            rule.pattern.lastIndex = 0;
            matched = rule.pattern.test(line);
          }

          if (matched) {
            const start = Math.max(0, index - 2);
            const end = Math.min(lines.length, index + 3);
            const snippet = lines
              .slice(start, end)
              .map((l, i) => `${start + i + 1} | ${l}`)
              .join("\n");

            findings.push({
              scanner: "eslint",
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
              toolName: "eslint",
              toolVersion,
              rulesetVersion,
              confidence: "high",
              cwe: rule.cwe,
              owasp: rule.owasp,
              ruleExplanation: rule.explanation,
              scannerEvidenceRef: `eslint:${rule.ruleId}:${file.path}:${lineNum}`,
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
      scanner: "eslint",
      version: toolVersion,
      rulesetVersion,
      status: "completed",
      findings,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      scanner: "eslint",
      version: toolVersion,
      rulesetVersion,
      status: "failed",
      error: err.message,
      findings: [],
      durationMs: Date.now() - startTime,
    };
  }
}
