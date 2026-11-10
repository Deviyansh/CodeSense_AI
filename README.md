# CodeSense AI

> **Complete Code Intelligence & Validated Remediation Platform**  
> *Deterministic static analysis provides the evidence; AI explains and assists remediation; developers retain control.*

Built strictly according to the **CodeSense AI Complete Technical Architecture & Development Blueprint**.

---

## 🌟 Platform Capabilities & Architecture Pillars

- **Evidence-First Architecture**: Strict separation between deterministic scanner evidence and AI explanations. AI never invents scanner results or converts ungrounded hypotheses into confirmed findings.
- **Canonical Finding Model & Provenance**:
  - Stable provenance tracking: `toolName`, `toolVersion`, `rulesetVersion`, `advisorySource`, `advisoryId`, `detectedAt`.
  - CWE and OWASP Top 10 category classifications.
  - Multi-factor deduplication: `SHA-256(scanner | ruleId | normalizedPath | codeAnchor)` with repository-level `stableKey`.
  - Full lifecycle tracking: `OPEN` ➔ `TRIAGED` ➔ `FIXED` (or `ACCEPTED_RISK`, `FALSE_POSITIVE`, `SUPPRESSED`).
- **Scanner Adapters with Pinned Tool & Ruleset Provenance**:
  - **ESLint Adapter**: Code quality and security checks pinned to `8.57.0` with `eslint-recommended-v8`.
  - **Semgrep Security Adapter**: AST and pattern-based vulnerability analysis pinned to `semgrep-1.78.0` with `p/security-audit-v1.2` covering SQLi, Command Injection, Path Traversal, Weak Crypto, and Prototype Pollution.
  - **Gitleaks Secrets Adapter**: Secret and credential detection pinned to `gitleaks-v8.18.4` with automated secret value masking/redaction in snippets, logs, reports, and AI prompts.
  - **OSV Dependency Intelligence**: Full `package-lock.json` lockfile parser (supporting v1, v2, v3 formats) with dependency path trees, direct vs transitive resolution, and semantic version (`semver`) range matching against curated OSV/GHSA advisories.
  - Per-scanner status tracking: `completed`, `partial`, `timed_out`, `failed`, `skipped`. Scanner failures are surfaced visibly rather than silently producing zero findings.
- **Controlled Patch Validation Pipeline (`POST /api/v1/findings/:id/patch/validate`)**:
  - Automated sandbox testing of candidate unified diffs before developer acceptance:
    1. **Workspace Boundary & Path Traversal Check**: Rejects absolute paths, directory traversal (`..`), and out-of-boundary targets.
    2. **Syntax & Parser Validation**: Verifies patched source compiles cleanly without syntax errors.
    3. **Scanner Rule Rerun**: Reruns the specific scanner rule on the patched code to ensure the vulnerability is eliminated.
    4. **Security Regression Check**: Verifies no new high or critical vulnerabilities were introduced.
  - Structured validation outcome: `passed`, `failed`, or `inconclusive` with cryptographic `patchHash`.
  - **Human in the Loop**: AI diffs are proposals; patches are never auto-merged to GitHub repositories.
- **Durable Queue & Reliable Workers**:
  - Asynchronous scan execution with bounded concurrency, retry on transient errors, and worker boot reconciliation.
  - Scan Cancellation (`POST /api/v1/scans/:id/cancel`): Cooperative cancellation checks across all worker pipeline stages.
- **Scan-to-Scan Comparison with Scanner Coverage Verification**:
  - Diffs two scans to identify regressions (`new`), remediations (`resolved`), and `persistent` findings.
  - **Coverage Guard**: If a scanner failed or was skipped in the target scan, prior findings from that scanner are categorized as `uncomparableFindings` rather than falsely declared resolved.
- **AI Code Review & Privacy Consent Boundary**:
  - Explicit user opt-in (`aiConsent`) required before code context is transmitted to external LLM providers (Gemini).
  - Strict secret redaction: Sensitive tokens are masked before model prompt construction.
  - Prompt injection defense: Untrusted repository content is isolated in strict boundary delimiters.
  - Server-side Zod schema validation for all structured review outputs.
  - Distinct `providerMode` reporting (`model` vs `deterministic_fallback`).
- **Audit Logging & Finding Triage (`POST /api/v1/findings/:id/triage`)**:
  - State assignment (`open`, `accepted_risk`, `false_positive`, `fixed`, `suppressed`), assignee delegation, and comment threads recorded with audit events.
- **Downloadable Audit Reports & Metrics Summary**:
  - Sanitized JSON and GitHub-flavored Markdown export with secret redaction.
  - Dashboard Metrics Summary (`GET /api/v1/metrics/summary`) with security posture trend and scanner health rates.

---

## 🏗️ System Architecture

```
Browser (React 18 + Tailwind CSS + Lucide Icons)
       │
       │ HTTPS REST / Cookies (JWT Session)
       ▼
Express API Server (Port 5000) ──────────────► MongoDB (System of Record)
       │                                     ► Audit Events & Patch Validations
       │ Dispatch { scanId, repoId, userId }
       ▼
Durable Scan Queue & Worker Engine
       ├────► GitHub API / Seeded Fixture Intake (Commit-Pinned)
       ├────► ESLint Quality Scanner (v8.57.0)
       ├────► Semgrep Security Scanner (v1.78.0)
       ├────► Gitleaks Secret Scanner (v8.18.4 with Redaction)
       ├────► OSV Lockfile Dependency Audit (Lockfile v1/v2/v3 + Semver)
       ├────► Canonical Normalization & SHA-256 Fingerprinting
       ├────► Patch Validation Sandbox (Syntax, Path, Rule Rerun)
       └────► AI Review Engine (Consent-Gated Gemini 1.5 Flash / Grounded Fallback)
```

---

## 💻 Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS | Modular components, scan diff viewer, patch review, triage workflow |
| **Server** | Node.js (ESM), Express 4 | REST API, Helmet, CORS, Cookie-Parser, Zod validation |
| **Database** | MongoDB + Mongoose | Scans, findings, AI reviews, patch validations, audit events |
| **Queue** | Durable scan queue | Concurrency limits, exponential retry, cancellation, worker crash recovery |
| **Analysis** | Multi-engine adapters | Pinned ESLint, Semgrep, Gitleaks, OSV Lockfile Audit |
| **AI Layer** | Structured review pipeline | Gemini 1.5 Flash with consent boundary, secret redaction, and local fallback |
| **Remediation**| Disposable sandbox pipeline | Path boundary check, VM syntax check, scanner rerun validation |
| **Testing** | Node.js Native Test Runner | Unit, integration, security, scanner, and API test coverage |

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# In project root (installs both npm workspaces)
npm install
```

### 2. Environment Configuration

```bash
# Copy example configuration
cp .env.example .env
```

### 3. Run the Full Stack

**Development Mode (Client & Server concurrent):**
```bash
# Terminal 1: API Server
npm run server

# Terminal 2: Vite React Frontend
npm run client
```
- Open `http://localhost:5173` in your browser.

**Production Mode:**
```bash
npm run build
npm start --prefix server
```
- Open `http://localhost:5000`.

---

## 🧪 Automated Test Suite

Run the comprehensive unit, scanner, IDOR, patch validation, and integration tests:

```bash
npm test
```

The automated test suite exercises:
1. Normalization, fingerprinting, and repository-level stable keys.
2. Secret redaction engine (AWS keys, GitHub tokens, Slack tokens, DB URIs).
3. Lockfile parsing and semantic version range matching against OSV advisories.
4. Multi-adapter scanner execution with full provenance metadata.
5. User registration, authentication, and session cookie validation.
6. Cross-user IDOR access prevention.
7. Asynchronous scan lifecycle and stage transitions.
8. AI review structured schema output and provider mode indicators.
9. Finding triage updates and audit logging.
10. Controlled patch validation pipeline with syntax checking and scanner rule reruns.
11. Security path traversal rejection in patch validation.
12. Scan cancellation cooperative aborts.
13. Scan comparison with incomplete scanner coverage verification.
14. Authorized dashboard metrics aggregation.
15. Sanitized JSON and Markdown audit report export with secret masking.

---

## 📁 Repository Structure

```
codesense-ai/
├── client/                     # React 18 Frontend
│   ├── src/
│   │   ├── components/         # Badges, Buttons, DiffViewer, CodeSnippet, Navbar
│   │   ├── features/           # Repositories, Scans, Findings, Triage
│   │   ├── lib/api.js          # REST API Client
│   │   ├── pages/              # Dashboard, Repositories, ScanDetail, Login
│   │   └── routes/             # AppRoutes, ProtectedRoute
│   ├── index.html
│   └── vite.config.js
├── server/                     # Express API & Worker Engine
│   ├── src/
│   │   ├── config/             # Environment, Database, Logger
│   │   ├── controllers/        # Auth, Repositories, Scans, Findings, Metrics
│   │   ├── middleware/         # Auth, RequestID, Error Handler
│   │   ├── models/             # User, Repository, Scan, Finding, AIReview, PatchValidation, AuditEvent
│   │   ├── queues/             # Durable Scan Job Queue & Cancellation
│   │   ├── routes/             # REST Route Definitions
│   │   ├── services/
│   │   │   ├── ai/             # AI Review Pipeline & Grounded Fallbacks
│   │   │   ├── analysis/       # Scanner Adapters (ESLint, Semgrep, Gitleaks, OSV Dependencies)
│   │   │   ├── github/         # GitHub Intake & Fixture Provider
│   │   │   └── remediation/    # Isolated Patch Validation Pipeline
│   │   ├── utils/              # Secret Redactor, Logger
│   │   ├── validators/         # Zod schemas
│   │   └── workers/            # Scan Worker Processor & Recovery
│   └── tests/                  # Automated Test Suite
├── fixtures/                   # Seeded vulnerable test repository
├── docs/                       # Architecture, API, Data Model, Security, Testing
├── .env.example
├── package.json
└── README.md
```

---

## 🛡️ Security & Privacy Guarantees

- **Evidence-First Trust**: Scanners provide traceable evidence; AI provides explanations and proposed fixes.
- **Explicit AI Consent**: Source code snippets are never sent to external AI providers without user consent.
- **Automatic Secret Redaction**: Credentials, tokens, and private keys are masked across all snippets, logs, reports, and AI prompts.
- **Isolated Patch Sandbox**: AI diffs are parsed, path-checked, syntax-verified, and scanner-tested in disposable workspaces before developer review.
- **Human Authority**: All remediation actions require explicit developer review and approval.
