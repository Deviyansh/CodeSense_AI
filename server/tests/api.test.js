import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import { Scan } from "../src/models/scan.model.js";
import {
  generateFingerprint,
  generateStableKey,
  normalizeSeverity,
} from "../src/services/analysis/normalization.service.js";
import { redactSecrets } from "../src/utils/secret-redactor.js";
import {
  parseNpmLockfile,
  runDependencyScanner,
} from "../src/services/analysis/adapters/dependency.adapter.js";
import { runSecretScanner } from "../src/services/analysis/adapters/secrets.adapter.js";
import { runSecurityScanner } from "../src/services/analysis/adapters/security.adapter.js";
import { runESLintScanner } from "../src/services/analysis/adapters/eslint.adapter.js";

test("CodeSense AI - Comprehensive Platform Test Suite", async (t) => {
  let userCookie = "";
  let userBCookie = "";
  let repoId = "";
  let scanId = "";
  let sampleFindingId = "";

  // -------------------------------------------------------------
  // Layer 1: Unit Tests
  // -------------------------------------------------------------
  await t.test("Unit: Normalization, Fingerprinting & Stable Keys", () => {
    assert.equal(normalizeSeverity("CRITICAL"), "critical");
    assert.equal(normalizeSeverity("warn"), "medium");
    assert.equal(normalizeSeverity("unknown_sev"), "unknown");

    const fp1 = generateFingerprint({
      scanner: "eslint",
      ruleId: "no-eval",
      filePath: "src\\index.js",
      codeAnchor: "eval(input);",
    });

    const fp2 = generateFingerprint({
      scanner: "eslint",
      ruleId: "no-eval",
      filePath: "src/index.js",
      codeAnchor: "  eval(input);  ",
    });

    assert.equal(fp1, fp2, "Fingerprints must be path-normalized and whitespace-trimmed");

    const stableKey = generateStableKey({
      ruleId: "sec-sql-injection",
      filePath: "src/users.js",
      category: "security",
    });
    assert.ok(stableKey, "Stable key must be generated");
  });

  await t.test("Unit: Secret Redaction Engine", () => {
    const rawText = "export const KEY = 'AKIAEXAMPLE0000000000'; const token = 'ghp_123456789012345678901234567890123456';";
    const sanitized = redactSecrets(rawText);

    assert.ok(!sanitized.includes("AKIAEXAMPLE0000000000"), "AWS key must be masked");
    assert.ok(sanitized.includes("AKIA****************"), "AWS key masked replacement");
    assert.ok(!sanitized.includes("ghp_123456789012345678901234567890123456"), "GitHub PAT must be masked");
  });

  await t.test("Unit: Lockfile Parsing & Semver Range Audit", async () => {
    const mockLockfile = JSON.stringify({
      name: "test-app",
      lockfileVersion: 2,
      packages: {
        "": { dependencies: { lodash: "4.17.15", jsonwebtoken: "8.5.1" } },
        "node_modules/lodash": { version: "4.17.15" },
        "node_modules/jsonwebtoken": { version: "8.5.1" },
      },
    });

    const inventory = parseNpmLockfile(mockLockfile);
    assert.equal(inventory.length, 2);
    assert.equal(inventory[0].name, "lodash");
    assert.equal(inventory[0].version, "4.17.15");

    const scanResult = await runDependencyScanner({
      files: [{ path: "package-lock.json", content: mockLockfile }],
    });

    assert.equal(scanResult.status, "completed");
    assert.ok(scanResult.findings.length >= 2, "Must find CVE-2020-8203 and CVE-2022-23529");
    assert.equal(scanResult.findings[0].category, "dependencies");
    assert.ok(scanResult.findings[0].advisoryId, "Advisory ID must exist");
  });

  await t.test("Unit: Multi-Adapter Execution & Secret Redaction in Evidence", async () => {
    const secretFiles = [
      {
        path: "secrets.js",
        content: "const awsKey = 'AKIAEXAMPLE0000000000';\nconst slack = 'xoxb-123456789012-1234567890123-abcde';",
      },
    ];

    const secretResult = await runSecretScanner({ files: secretFiles });
    assert.equal(secretResult.status, "completed");
    assert.ok(secretResult.findings.length > 0);
    // Ensure raw secret is not in snippet
    assert.ok(!secretResult.findings[0].codeSnippet.includes("AKIAEXAMPLE0000000000"));

    const jsFiles = [
      {
        path: "eval.js",
        content: "eval('2 + 2');\nvar oldVar = 10;\nif (x == 5) {}\ndebugger;",
      },
    ];

    const eslintResult = await runESLintScanner({ files: jsFiles });
    assert.equal(eslintResult.status, "completed");
    assert.ok(eslintResult.findings.some((f) => f.ruleId === "no-eval"));
    assert.ok(eslintResult.findings.some((f) => f.ruleId === "no-var"));
    assert.ok(eslintResult.findings.some((f) => f.ruleId === "eqeqeq"));
    assert.ok(eslintResult.findings.some((f) => f.ruleId === "no-debugger"));
  });

  // -------------------------------------------------------------
  // Layer 2: API & Integration Tests
  // -------------------------------------------------------------
  await t.test("1. GET /api/v1/health returns liveness and readiness status", async () => {
    const res = await request(app).get("/api/v1/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, "ok");
    assert.equal(res.body.data.ready, true);
    assert.ok(res.body.data.queue);
  });

  await t.test("2. POST /api/v1/auth/register creates user and rejects duplicates", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Security Lead",
        email: "lead@codesense.test",
        password: "SuperSecretPassword123!",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.headers["set-cookie"]?.some((cookie) => cookie.startsWith("token=")));
    assert.equal(res.body.data.user.email, "lead@codesense.test");
    userCookie = res.headers["set-cookie"].find((cookie) => cookie.startsWith("token=")).split(";")[0];

    // Test duplicate registration rejected
    const dupRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Duplicate User",
        email: "lead@codesense.test",
        password: "AnotherPassword123!",
      });
    assert.equal(dupRes.status, 409);
    assert.equal(dupRes.body.error.code, "EMAIL_ALREADY_EXISTS");

    // Register User B for IDOR testing
    const userBRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Attacker User B",
        email: "attacker@codesense.test",
        password: "AttackerPassword123!",
      });
    assert.equal(userBRes.status, 201);
    userBCookie = userBRes.headers["set-cookie"].find((cookie) => cookie.startsWith("token=")).split(";")[0];
  });

  await t.test("3. POST /api/v1/auth/login validates credentials", async () => {
    const successRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "lead@codesense.test",
        password: "SuperSecretPassword123!",
      });
    assert.equal(successRes.status, 200);
    assert.ok(successRes.headers["set-cookie"]?.some((cookie) => cookie.startsWith("token=")));

    const failRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "lead@codesense.test",
        password: "WrongPassword!",
      });
    assert.equal(failRes.status, 401);
  });

  await t.test("4. PATCH /api/v1/auth/settings updates user AI consent opt-in", async () => {
    const updateRes = await request(app)
      .patch("/api/v1/auth/settings")
      .set("Cookie", userCookie)
      .send({
        aiConsent: true,
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.user.aiConsent, true);
  });

  await t.test("5. POST /api/v1/repositories/seed-demo creates demo repo", async () => {
    const res = await request(app)
      .post("/api/v1/repositories/seed-demo")
      .set("Cookie", userCookie);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.fullName, "demo/sample-ecommerce-api");
    repoId = res.body.data._id;
  });

  await t.test("6. Security: Cross-user IDOR access is blocked", async () => {
    const idorRes = await request(app)
      .get(`/api/v1/repositories/${repoId}`)
      .set("Cookie", userBCookie);

    assert.equal(idorRes.status, 404);
  });

  await t.test("7. POST /api/v1/repositories/:id/scans queues scan and returns 202", async () => {
    const res = await request(app)
      .post(`/api/v1/repositories/${repoId}/scans`)
      .set("Cookie", userCookie)
      .send({
        branch: "main",
      });

    assert.equal(res.status, 202);
    assert.ok(res.body.data.scanId);
    assert.ok(res.body.data.commitSha);
    assert.equal(res.body.data.status, "queued");
    scanId = res.body.data.scanId;
  });

  await t.test("8. Worker executes scan and persists normalized findings with full provenance", async () => {
    let completed = false;
    for (let i = 0; i < 25; i++) {
      const statusRes = await request(app)
        .get(`/api/v1/scans/${scanId}`)
        .set("Cookie", userCookie);

      if (statusRes.body.data.status === "completed") {
        completed = true;
        assert.ok(statusRes.body.data.summary.total > 0);
        assert.ok(statusRes.body.data.scanners?.length >= 4, "Must record per-scanner execution status");
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(completed, "Scan should complete successfully");

    // Fetch findings
    const findingsRes = await request(app)
      .get(`/api/v1/scans/${scanId}/findings`)
      .set("Cookie", userCookie);

    assert.equal(findingsRes.status, 200);
    assert.ok(findingsRes.body.data.items.length > 0);
    sampleFindingId = findingsRes.body.data.items[0]._id;

    // Verify finding schema properties
    const first = findingsRes.body.data.items[0];
    assert.ok(first.fingerprint, "Fingerprint must exist");
    assert.ok(first.severity, "Severity must exist");
    assert.ok(first.category, "Category must exist");
    assert.ok(first.scanner, "Scanner must exist");
    assert.ok(first.toolVersion, "Tool version must exist");
    assert.ok(first.rulesetVersion, "Ruleset version must exist");
  });

  await t.test("9. POST /api/v1/findings/:id/review generates structured AI explanation", async () => {
    const reviewRes = await request(app)
      .post(`/api/v1/findings/${sampleFindingId}/review`)
      .set("Cookie", userCookie);

    assert.equal(reviewRes.status, 200);
    assert.ok(reviewRes.body.data.summary);
    assert.ok(reviewRes.body.data.whyItMatters);
    assert.ok(reviewRes.body.data.suggestedFix);
    assert.ok(reviewRes.body.data.providerMode);
    assert.ok(Array.isArray(reviewRes.body.data.assumptions));
    assert.ok(Array.isArray(reviewRes.body.data.validationSteps));
  });

  await t.test("10. POST /api/v1/findings/:id/triage updates lifecycle and triage state", async () => {
    const triageRes = await request(app)
      .post(`/api/v1/findings/${sampleFindingId}/triage`)
      .set("Cookie", userCookie)
      .send({
        state: "accepted_risk",
        assignee: "Lead Architect",
        comment: "Risk verified and temporarily accepted until next sprint",
      });

    assert.equal(triageRes.status, 200);
    assert.equal(triageRes.body.data.state, "accepted_risk");
    assert.equal(triageRes.body.data.status, "ACCEPTED_RISK");
    assert.equal(triageRes.body.data.assignee, "Lead Architect");
    assert.equal(triageRes.body.data.comments.length, 1);
  });

  await t.test("11. POST /api/v1/findings/:id/patch/validate runs controlled validation pipeline", async () => {
    const validateRes = await request(app)
      .post(`/api/v1/findings/${sampleFindingId}/patch/validate`)
      .set("Cookie", userCookie)
      .send({});

    assert.equal(validateRes.status, 200);
    assert.ok(validateRes.body.data.outcome);
    assert.ok(validateRes.body.data.patchHash);
    assert.ok(Array.isArray(validateRes.body.data.checks));
    assert.ok(validateRes.body.data.checks.length >= 3);
  });

  await t.test("12. Security: Path traversal diff is rejected in patch validation", async () => {
    const maliciousDiff = `--- a/../../etc/passwd\n+++ b/../../etc/passwd\n@@ -1,1 +1,1 @@\n-root:x:0:0\n+hacked`;
    const traversalRes = await request(app)
      .post(`/api/v1/findings/${sampleFindingId}/patch/validate`)
      .set("Cookie", userCookie)
      .send({
        diff: maliciousDiff,
      });

    assert.equal(traversalRes.status, 200);
    assert.equal(traversalRes.body.data.outcome, "failed");
    assert.ok(
      traversalRes.body.data.checks.some((c) => c.name.includes("Traversal") && c.passed === false)
    );
  });

  await t.test("13. POST /api/v1/scans/:id/cancel cancels queued or in-progress scan", async () => {
    // Get current user id
    const meRes = await request(app).get("/api/v1/auth/me").set("Cookie", userCookie);
    const userId = meRes.body.data.user.id;

    // Create a queued scan record directly
    const newScan = await Scan.create({
      repositoryId: repoId,
      requestedBy: userId,
      branch: "main",
      commitSha: "c0ffee1234",
      status: "queued",
      stage: "queued",
      progress: 0,
    });

    const cancelRes = await request(app)
      .post(`/api/v1/scans/${newScan._id}/cancel`)
      .set("Cookie", userCookie);

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, "cancelled");
  });

  await t.test("14. GET /api/v1/scans/:id/diff/:compareScanId compares scans with coverage check", async () => {
    const ownRes = await request(app)
      .get(`/api/v1/scans/${scanId}/diff/${scanId}`)
      .set("Cookie", userCookie);

    assert.equal(ownRes.status, 200);
    assert.ok(ownRes.body.data.diffSummary);
    assert.equal(ownRes.body.data.diffSummary.newCount, 0);
    assert.ok(ownRes.body.data.diffSummary.persistentCount > 0);
    assert.ok(Array.isArray(ownRes.body.data.uncomparableFindings));
  });

  await t.test("15. GET /api/v1/metrics/summary returns aggregated dashboard metrics", async () => {
    const metricsRes = await request(app)
      .get("/api/v1/metrics/summary")
      .set("Cookie", userCookie);

    assert.equal(metricsRes.status, 200);
    assert.ok(metricsRes.body.data.totalScans >= 1);
    assert.ok(metricsRes.body.data.severityDistribution);
    assert.ok(metricsRes.body.data.scannerHealth);
    assert.ok(Array.isArray(metricsRes.body.data.postureTrend));
  });

  await t.test("16. GET /api/v1/scans/:id/report exports report as JSON and Markdown with secret redaction", async () => {
    const jsonRes = await request(app)
      .get(`/api/v1/scans/${scanId}/report`)
      .set("Cookie", userCookie);
    assert.equal(jsonRes.status, 200);
    assert.ok(jsonRes.body.data.findings.length > 0);

    const mdRes = await request(app)
      .get(`/api/v1/scans/${scanId}/report?format=markdown`)
      .set("Cookie", userCookie);
    assert.equal(mdRes.status, 200);
    assert.ok(mdRes.text.includes("CodeSense AI Security & Quality Audit Report"));
    assert.ok(!mdRes.text.includes("AKIAEXAMPLE0000000000"), "Export report must have secrets redacted");
  });
});
