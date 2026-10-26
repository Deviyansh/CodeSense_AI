# CodeSense AI

> **Intelligent Code Review & Security Remediation Platform**  
> *Deterministic static analysis provides the evidence; AI helps explain and remediate it.*

Built strictly according to the **CodeSense AI Complete Project Blueprint (MERN + JavaScript)**.

---

## 🌟 Key Features

- **Evidence-First Architecture**: Clear separation between deterministic scanner evidence and AI explanations.
- **Rule-based static analysis adapters**: local JavaScript pattern checks, security heuristics, secret-pattern detection, and a small curated dependency advisory list. These adapters are not the official ESLint, Semgrep, or Gitleaks binaries; results should be treated as heuristic findings until those tools are integrated.
- **In-process asynchronous scan pipeline (single-instance prototype)**:
  - `POST /api/v1/repositories/:id/scans` returns `202 Accepted` immediately.
  - A process-local worker queue coordinates intake, pattern-based analysis, normalization, and persistence. Queued jobs are not durable across restarts; use a persistent Redis-backed queue before multi-instance or production-scale use.
  - Real-time stage indicators (`intake` ➔ `static_analysis` ➔ `secret_scan` ➔ `normalization` ➔ `persistence` ➔ `completed`).
- **Stable Fingerprinting & Deduplication**:
  - `SHA-256(scanner | ruleId | normalizedPath | codeAnchor)` ensures stable identity across commit code shifts.
- **AI-assisted explanations & Unified Diff suggestions**:
  - Gemini is called only when `LLM_API_KEY` is configured; otherwise a deterministic rule-based fallback is used. Do not describe fallback results as model-generated AI output.
  - Structured output fields (`summary`, `whyItMatters`, `suggestedFix`, `assumptions`, `confidence`, `validationSteps`).
  - Unified diff patch generation (`--- a/... +++ b/...`) with 1-click copy and export.
  - Strict fault tolerance: AI provider degradation never erases scanner evidence.
- **Commit-to-Commit Comparison**:
  - Diff two scans to identify regressions (new findings), remediations (resolved findings), and persistent issues.
- **Downloadable Audit Reports**:
  - Export reports as structured JSON or formatted GitHub Markdown.
- **Built-In Seeded Vulnerability Fixture**:
  - Instant 1-click test drive with realistic vulnerabilities and security flaws.

---

## 🏗️ System Architecture

```
Browser (React + Tailwind CSS)
       │
       │ HTTPS / JSON (JWT Session Cookie)
       ▼
Express API Server (Port 5000) ──────► MongoDB / Mongoose
       │
       │ Enqueue { scanId, repositoryId, requestedBy }
       ▼
Asynchronous Worker Pipeline
       ├────► GitHub API / Fixture Source Provider
       ├────► AST & Semgrep Security Scanner Adapter
       ├────► Gitleaks Secret Scanner Adapter
       ├────► Dependency Advisory Audit Adapter
       ├────► Normalization & Fingerprinting Engine
       ├────► Persist Findings & Scan Terminal State
       └────► AI Review & Unified Diff Engine (Optional / Fault-Tolerant)
```

---

## 💻 Tech Stack

| Layer | Choice | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18 + JavaScript | Modern component architecture with Tailwind CSS, Lucide icons |
| **Build Tool** | Vite | Lightning-fast development & production bundling |
| **Server** | Node.js + Express | REST API, ES Modules, Helmet, CORS, Cookie-Parser |
| **Database** | MongoDB + Mongoose | MongoDB is required in production; local memory mode is for development/tests only |
| **Queue** | In-process worker queue | Concurrency bound; not durable across process restarts; no Redis/BullMQ integration yet |
| **Analysis** | Multi-Adapter Engine | ESLint, Semgrep patterns, Gitleaks, Dependency Advisories |
| **AI Layer** | Structured Schema Adapter | Gemini / LLM integration with grounded local fallback |
| **Testing** | Node.js Test Runner + Supertest | integration tests (run locally before publishing; see current test status) |

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
# In project root (installs both npm workspaces)
npm install
```

### 2. Environment Configuration

Copy the example configuration file:
```bash
cp .env.example .env
```

### 3. Run the Application

You can start the full stack in one step:

**Development Mode (Client & Server concurrent):**
```bash
# Terminal 1: API Server
npm run server

# Terminal 2: Vite React Frontend
npm run client
```
- Open `http://localhost:5173` in your browser.

**Production Mode (Self-contained):**
```bash
npm run build
npm start --prefix server
```
- Open `http://localhost:5000`.

---

## 🧪 Running Automated Tests

Run the comprehensive integration test suite (11 test suites covering authentication, IDOR access controls, scanners, asynchronous queues, fingerprinting, AI reviews, and report exports):

```bash
npm test
```

---

## 📁 Repository Structure

```
codesense-ai/
├── client/                     # React 18 Frontend
│   ├── src/
│   │   ├── components/         # Badges, Buttons, DiffViewer, CodeSnippet, Navbar
│   │   ├── features/           # Auth, Repositories, Scans, Findings
│   │   ├── lib/api.js          # REST API Client
│   │   ├── pages/              # Dashboard, Repositories, ScanDetail, Login
│   │   ├── routes/             # AppRoutes, ProtectedRoute
│   │   └── styles/index.css    # Tailwind CSS & design tokens
│   ├── index.html
│   └── vite.config.js
├── server/                     # Express API & Worker Engine
│   ├── src/
│   │   ├── config/             # Environment, Database, Logger
│   │   ├── controllers/        # Auth, Repositories, Scans, Findings
│   │   ├── middleware/         # Auth, RequestID, Error Handler
│   │   ├── models/             # User, Repository, Scan, Finding, AIReview
│   │   ├── queues/             # Asynchronous Scan Job Queue
│   │   ├── routes/             # REST Route Definitions
│   │   ├── services/
│   │   │   ├── ai/             # AI Review Pipeline & Patch Generator
│   │   │   ├── analysis/       # Scanner Adapters (ESLint, Security, Secrets, Deps)
│   │   │   └── github/         # GitHub Intake & Fixture Provider
│   │   ├── validators/         # Zod schemas
│   │   ├── workers/            # Scan Worker Processor
│   │   ├── app.js
│   │   └── server.js
│   └── tests/                  # Integration Test Suite
├── fixtures/                   # Seeded vulnerable test repository
├── docs/                       # Architecture, API, Data Model, Security, Testing
├── .env.example
├── package.json
└── README.md
```

---

## 🛡️ Security & Privacy Boundary

- **Server-Side Authorization**: Every endpoint verifies resource ownership to protect against IDOR.
- **Bounded Inputs**: File sizes, file counts, and path traversal strings (`..`) are strictly validated.
- **Secret Redaction**: Credentials and authorization tokens are redacted in structured logs.
- **Static inspection only**: Current adapters do not execute repository scripts. They are heuristic pattern checks, not isolated containerized official scanner binaries.
- **Human in the Loop**: AI suggestions produce unified diffs that require explicit developer review before merging.
