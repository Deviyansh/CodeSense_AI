import { normalizeSeverity } from "../normalization.service.js";

const ESLINT_RULES = [
  {
    ruleId: "no-eval",
    title: "Disallow use of eval()",
    category: "security",
    severity: "critical",
    pattern: /\beval\s*\(/g,
    message: "eval() can lead to arbitrary code execution and injection vulnerabilities.",
  },
  {
    ruleId: "no-implied-eval",
    title: "Disallow implied eval via setTimeout / setInterval / Function",
    category: "security",
    severity: "high",
    pattern: /(?:setTimeout|setInterval)\s*\(\s*["'`]|new\s+Function\s*\(/g,
    message: "Passing strings to setTimeout/setInterval or new Function acts as an implied eval.",
  },
  {
    ruleId: "eqeqeq",
    title: "Require === and !== over == and !=",
    category: "correctness",
    severity: "medium",
    pattern: /(?:[^!=]==[^=]|[^!]===[^=]|!\s*=[^=])/g,
    customCheck: (line) => {
      // Look for == or != without being === or !==
      return /(?:[\w\s)\]])\s*(?:==|!=)\s*(?:[\w\s([{])/g.test(line) && !/(?:===|!==)/.test(line);
    },
    message: "Expected '===' or '!==' and instead saw '==' or '!=' which performs loose type coercion.",
  },
  {
    ruleId: "no-debugger",
    title: "Disallow debugger statements",
    category: "quality",
    severity: "medium",
    pattern: /\bdebugger\b;?/g,
    message: "Production code should not contain debugger statements.",
  },
  {
    ruleId: "no-var",
    title: "Require let or const instead of var",
    category: "quality",
    severity: "low",
    pattern: /\bvar\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    message: "Unexpected var, use let or const instead to ensure block scoping.",
  },
  {
    ruleId: "no-alert",
    title: "Disallow the use of alert, confirm, and prompt",
    category: "quality",
    severity: "low",
    pattern: /\b(?:alert|confirm|prompt)\s*\(/g,
    message: "Unexpected alert/confirm/prompt statement in application code.",
  },
];

export async function runESLintScanner({ files }) {
  const findings = [];
  const version = "8.57.0";

  for (const file of files) {
    if (!file.path.endsWith(".js") && !file.path.endsWith(".jsx") && !file.path.endsWith(".ts") && !file.path.endsWith(".tsx")) {
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
          const snippet = lines.slice(start, end).map((l, i) => `${start + i + 1} | ${l}`).join("\n");

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
            codeAnchor: line.trim(),
            codeSnippet: snippet,
            source: "static-analysis",
            rawMetadata: {
              scannerVersion: version,
              lineContent: line.trim(),
            },
          });
        }
      }
    });
  }

  return {
    scanner: "eslint",
    version,
    rulesetVersion: "1.0.0",
    findings,
  };
}
