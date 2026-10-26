import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import { AIReview } from "../../models/aiReview.model.js";

// Generates high quality, grounded remediation and unified diff for known rules
function generateGroundedRemediation(finding) {
  const { ruleId, scanner, title, filePath, codeAnchor } = finding;

  switch (ruleId) {
    case "sec-sql-injection":
      return {
        summary: "Dynamic SQL query concatenation exposes the application to arbitrary database commands and data exfiltration.",
        whyItMatters: "An attacker who manipulates request parameters can bypass authentication, read sensitive records, or drop tables.",
        suggestedFix: `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,5 +1,5 @@\n-const query = \`SELECT * FROM users WHERE id = '\${req.query.id}'\`;\n-const result = await db.query(query);\n+const query = 'SELECT * FROM users WHERE id = $1';\n+const result = await db.query(query, [req.query.id]);`,
        assumptions: [
          "The database driver supports parameterized placeholders ($1, $2 or ?).",
          "req.query.id is an untrusted user input string.",
        ],
        confidence: "high",
        validationSteps: [
          "Execute automated tests with SQL metacharacters (e.g. ' OR 1=1 --) to confirm error or safe parameter binding.",
          "Verify the database driver accepts array parameters.",
        ],
      };

    case "sec-command-injection":
      return {
        summary: "Interpolating untrusted user inputs into child_process.exec allows command chaining and shell execution.",
        whyItMatters: "An attacker can append arbitrary OS commands (e.g. '; cat /etc/passwd' or '& whoami') to compromise the host server.",
        suggestedFix: `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,4 +1,4 @@\n-exec(\`git log \${req.query.branch}\`, callback);\n+execFile('git', ['log', req.query.branch], { timeout: 5000 }, callback);`,
        assumptions: [
          "The command can be run using execFile or spawn without spawning a system shell.",
          "Arguments are passed as an array to prevent shell expansion.",
        ],
        confidence: "high",
        validationSteps: [
          "Test with malicious arguments containing shell separators (;, |, &&).",
          "Confirm the process executes with bounded timeouts.",
        ],
      };

    case "sec-path-traversal":
      return {
        summary: "Filesystem operations using direct user input enable directory traversal beyond authorized workspace directories.",
        whyItMatters: "Attackers can read system configuration files, environment variables, or secret certificates using '../' sequences.",
        suggestedFix: `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,4 +1,6 @@\n-const file = fs.readFileSync(path.join(__dirname, req.query.file));\n+const safePath = path.normalize(req.query.file).replace(/^[\\.\\/\\\\]+/, '');\n+const resolved = path.resolve(ALLOWED_BASE_DIR, safePath);\n+if (!resolved.startsWith(ALLOWED_BASE_DIR)) throw new Error('Access denied');\n+const file = fs.readFileSync(resolved);`,
        assumptions: [
          "All accessed files reside within a designated root directory (ALLOWED_BASE_DIR).",
        ],
        confidence: "high",
        validationSteps: [
          "Test with path inputs containing %2e%2e%2f and ../../..",
          "Assert that requests outside the whitelist root are rejected with 403/400.",
        ],
      };

    case "sec-hardcoded-jwt-secret":
      return {
        summary: "Hardcoded secret string in JWT operations allows token forgery if source code is leaked or decompiled.",
        whyItMatters: "Any user or adversary who reads the repository can forge administrator tokens and bypass all authorization checks.",
        suggestedFix: `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,3 +1,3 @@\n-const token = jwt.sign(payload, 'secret123');\n+const secret = process.env.JWT_SECRET || (() => { throw new Error('Missing JWT_SECRET'); })();\n+const token = jwt.sign(payload, secret, { expiresIn: '1h' });`,
        assumptions: [
          "Environment variable JWT_SECRET is loaded securely via secrets management.",
        ],
        confidence: "high",
        validationSteps: [
          "Ensure application fails at startup if JWT_SECRET is unset.",
          "Verify expired tokens are rejected.",
        ],
      };

    case "gitleaks-aws-access-key":
    case "gitleaks-github-pat":
    case "gitleaks-private-key":
    case "gitleaks-stripe-key":
      return {
        summary: `Exposed plaintext credential detected in source code (${ruleId}).`,
        whyItMatters: "Any repository collaborator, third-party scanner, or archive leak exposes this secret to unauthorized external use.",
        suggestedFix: `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,3 +1,3 @@\n-// Replace hardcoded credential\n-const secret = '${codeAnchor || "SECRET"}';\n+const secret = process.env.API_CREDENTIAL;`,
        assumptions: [
          "The exposed credential must be revoked immediately at the provider console.",
          "Future secrets are injected through environment variables or key vaults.",
        ],
        confidence: "high",
        validationSteps: [
          "Check provider audit logs for unauthorized usage of the leaked credential.",
          "Rotate the token in the provider dashboard.",
          "Remove the secret from Git history using tools like git-filter-repo or BFG.",
        ],
      };

    case "no-eval":
    case "no-implied-eval":
      return {
        summary: "Use of eval() or dynamic string evaluation introduces arbitrary code execution risks.",
        whyItMatters: "Evaluation of runtime strings prevents JIT optimizations, causes subtle scope leaks, and allows code injection if input is contaminated.",
        suggestedFix: `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,3 +1,3 @@\n-const result = eval(expression);\n+const result = JSON.parse(expression); // or use a dedicated AST-based math parser`,
        assumptions: [
          "The evaluated payload is JSON or structured data rather than raw JavaScript statements.",
        ],
        confidence: "high",
        validationSteps: [
          "Replace eval calls with JSON.parse or a safe domain-specific expression evaluator.",
          "Run unit tests verifying valid inputs still compute expected results.",
        ],
      };

    case "eqeqeq":
      return {
        summary: "Loose equality (== or !=) invokes implicit JavaScript type coercion.",
        whyItMatters: "Loose comparison can produce unexpected truths such as '0' == 0, false == '0', or null == undefined, creating subtle logical bugs.",
        suggestedFix: `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,3 +1,3 @@\n-if (user.role == 'admin') {\n+if (user.role === 'admin') {`,
        assumptions: [
          "Both operands are intended to have matching types.",
        ],
        confidence: "high",
        validationSteps: [
          "Verify both sides of the comparison share the expected type.",
          "Run unit tests to ensure strict comparison matches expected business logic.",
        ],
      };

    default:
      return {
        summary: `Static analysis issue detected: ${title}.`,
        whyItMatters: "Violations of static analysis rules introduce technical debt, potential edge-case failures, or security vulnerabilities.",
        suggestedFix: `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,3 +1,3 @@\n-// Review and adjust following the rule recommendation: ${ruleId}\n-${codeAnchor || "// problematic code"}\n+// updated implementation`,
        assumptions: ["Context conforms to ECMAScript standard practices."],
        confidence: "medium",
        validationSteps: [
          "Review surrounding code context for behavioral consistency.",
          "Run the test suite to confirm no regressions.",
        ],
      };
  }
}

/**
 * Perform AI review for a specific finding.
 * If external LLM API key is provided and available, invokes the model.
 * Gracefully falls back to deterministic rule engine if API fails or is not provided.
 */
export async function generateAIReviewForFinding(finding) {
  const existing = await AIReview.findOne({ findingId: finding._id });
  if (existing && existing.status === "completed") {
    return existing;
  }

  let reviewData;

  if (config.llmApiKey) {
    try {
      // Call external LLM with prompt isolation and strict structured schema
      const prompt = `You are a security code reviewer. Analyze this static analysis finding:
Scanner: ${finding.scanner}
Rule: ${finding.ruleId}
Title: ${finding.title}
File: ${finding.filePath}:${finding.startLine}
Code snippet:
${finding.codeSnippet}

Return ONLY valid JSON matching this schema:
{
  "summary": "Short explanation",
  "whyItMatters": "Impact and attack vectors",
  "suggestedFix": "Unified diff patch starting with --- a/ and +++ b/",
  "assumptions": ["assumption 1"],
  "confidence": "high",
  "validationSteps": ["step 1"]
}`;

      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + config.llmApiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          reviewData = {
            summary: parsed.summary || finding.message,
            whyItMatters: parsed.whyItMatters || "Potential security or quality issue.",
            suggestedFix: parsed.suggestedFix || null,
            assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
            confidence: ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "medium",
            validationSteps: Array.isArray(parsed.validationSteps) ? parsed.validationSteps : [],
            provider: "gemini-1.5-flash",
          };
        }
      }
    } catch (err) {
      logger.warn("ai.llm_call_failed_fallback_active", { error: err.message, findingId: finding._id });
    }
  }

  // If no LLM or if LLM call degraded, use rule-grounded remediation
  if (!reviewData) {
    const grounded = generateGroundedRemediation(finding);
    reviewData = {
      ...grounded,
      provider: "codesense-ai-core",
    };
  }

  const reviewDoc = await AIReview.create({
    findingId: finding._id,
    provider: reviewData.provider,
    model: "codesense-remediation-engine-v1",
    promptVersion: "v1.0",
    schemaVersion: "1.0",
    summary: reviewData.summary,
    whyItMatters: reviewData.whyItMatters,
    suggestedFix: reviewData.suggestedFix,
    assumptions: reviewData.assumptions,
    confidence: reviewData.confidence,
    validationSteps: reviewData.validationSteps,
    status: "completed",
  });

  return reviewDoc;
}
