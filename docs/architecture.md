# CodeSense AI — Architecture Guide

## 1. System Overview
CodeSense AI is a developer platform that pairs deterministic code-analysis engines (AST checkers, Semgrep-compatible security rules, Gitleaks secret scanners, and dependency audit tools) with structured AI explanations and unified diff remediations.

```
Browser (React + Tailwind)
       │
       │ HTTPS / JSON (JWT Session Cookie)
       ▼
Express API (Port 5000) ──────► MongoDB (Mongoose)
       │
       │ Enqueue { scanId, repositoryId, requestedBy }
       ▼
Asynchronous Worker Pipeline
       ├────► GitHub API / Fixture Source Provider
       ├────► Bounded AST & Semgrep Scanner Adapter
       ├────► Gitleaks Secret Scanner Adapter
       ├────► Dependency Advisory Audit Adapter
       ├────► Normalization & Fingerprinting Engine
       ├────► Persist Findings & Scan Terminal State
       └────► AI Review & Unified Diff Engine (Optional / Fault-Tolerant)
```

## 2. Core Engineering Principle
> **Static analysis provides the evidence; AI helps explain it. Keep those roles distinct in both code and UI.**

Scanners run deterministically to produce evidence (rule ID, file path, line numbers, code anchors). The AI service translates these findings into human-readable impact analyses and unified diff candidate patches. AI failures never erase or block deterministic findings.

## 3. Asynchronous Execution Lifecycle
1. `POST /api/v1/repositories/:id/scans` pins the commit SHA and records a scan in `queued` state.
2. Returns `HTTP 202 Accepted` immediately.
3. Asynchronous worker picks up the job and moves through stages:
   - `intake` (10% - 25%): Validates path traversal, enforces file count and size limits.
   - `static_analysis` (25% - 50%): Runs ESLint and Semgrep security patterns.
   - `secret_scan` (50% - 75%): Runs Gitleaks regex patterns and package.json audit.
   - `normalization` (75% - 90%): Calculates deterministic SHA-256 fingerprints and deduplicates findings.
   - `persistence` (90% - 100%): Safely stores findings and records completed summary metrics.
4. Client polls `/api/v1/scans/:id` until a terminal state (`completed`, `failed`, or `cancelled`) is reached.


## Implementation status note
The current worker queue is an in-process queue, not Redis/BullMQ. It is suitable for local development and a single-process demo only; pending scans can be lost on restart. The scanner adapters are rule-based heuristics and should not be represented as executions of the official ESLint, Semgrep, Gitleaks, or dependency audit tools.
