import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";

test("API Suite - CodeSense AI", async (t) => {
  let userCookie = "";
  let userBCookie = "";
  let repoId = "";
  let scanId = "";
  let sampleFindingId = "";

  await t.test("1. GET /api/v1/health returns status ok", async () => {
    const res = await request(app).get("/api/v1/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, "ok");
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

  await t.test("4. Protected routes reject unauthorized requests", async () => {
    const unauthRes = await request(app).get("/api/v1/repositories");
    assert.equal(unauthRes.status, 401);
    assert.equal(unauthRes.body.error.code, "AUTH_REQUIRED");
  });

  
await t.test("5. POST /api/v1/repositories/seed-demo creates demo repo", async () => {
  const res = await request(app)
    .post("/api/v1/repositories/seed-demo")
    .set("Cookie", userCookie);

  assert.equal(res.status, 201);
  assert.equal(res.body.data.fullName, "demo/sample-ecommerce-api");
  assert.equal(res.body.data.providerRepoId, "fixture-ecommerce-01");

  repoId = res.body.data._id;
});


  await t.test("6. Security: Cross-user IDOR access is blocked", async () => {
    // User B tries to access User A's repository
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

  await t.test("8. Worker executes scan and persists normalized findings", async () => {
    // Wait for worker job to complete (small delay)
    let completed = false;
    for (let i = 0; i < 20; i++) {
      const statusRes = await request(app)
        .get(`/api/v1/scans/${scanId}`)
        .set("Cookie", userCookie);

      if (statusRes.body.data.status === "completed") {
        completed = true;
        assert.ok(statusRes.body.data.summary.total > 0);
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
  });

  await t.test("8.5. Security: Cross-user scan comparison is blocked", async () => {
    // User B must not compare User A's scan, even against itself.
    const idorRes = await request(app)
      .get(`/api/v1/scans/${scanId}/diff/${scanId}`)
      .set("Cookie", userBCookie);

    assert.equal(idorRes.status, 404);

    // User A can compare their own scan against itself.
    const ownRes = await request(app)
      .get(`/api/v1/scans/${scanId}/diff/${scanId}`)
      .set("Cookie", userCookie);

    assert.equal(ownRes.status, 200);
  });

  await t.test("9. POST /api/v1/findings/:id/review generates structured AI explanation", async () => {
    const reviewRes = await request(app)
      .post(`/api/v1/findings/${sampleFindingId}/review`)
      .set("Cookie", userCookie);

    assert.equal(reviewRes.status, 200);
    assert.ok(reviewRes.body.data.summary);
    assert.ok(reviewRes.body.data.whyItMatters);
    assert.ok(reviewRes.body.data.suggestedFix);
    assert.ok(Array.isArray(reviewRes.body.data.assumptions));
    assert.ok(Array.isArray(reviewRes.body.data.validationSteps));
  });

  await t.test("10. GET /api/v1/scans/:id/report exports report as JSON and Markdown", async () => {
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
  });
});
