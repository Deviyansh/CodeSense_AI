# CodeSense AI — MongoDB Data Model

## Collections

### 1. `users`
- `_id`: ObjectId
- `name`: String
- `emailNormalized`: String (Unique index, lowercase)
- `passwordHash`: String (Bcrypt salted hash)
- `aiConsent`: Boolean (Explicit user opt-in for external AI code analysis)
- `settings`: Object `{ maxScanConcurrency, defaultScanBranch }`
- `github`: Object `{ id, username, encryptedAccessToken, connectedAt }`
- `createdAt`, `updatedAt`: Date

### 2. `repositories`
- `_id`: ObjectId
- `ownerId`: ObjectId (Ref User)
- `provider`: String ("github")
- `providerRepoId`: String
- `fullName`: String (e.g. "octocat/hello-world")
- `defaultBranch`: String (default: "main")
- `visibility`: String ("public" | "private")
- `installationOrCredentialRef`: String
- `createdAt`, `updatedAt`: Date
- Indexes: `{ ownerId: 1, fullName: 1 }`

### 3. `scans`
- `_id`: ObjectId
- `repositoryId`: ObjectId (Ref Repository)
- `requestedBy`: ObjectId (Ref User)
- `branch`: String
- `commitSha`: String (Pinned Git commit)
- `status`: String ("queued" | "running" | "completed" | "failed" | "cancelled")
- `stage`: String ("intake" | "static_analysis" | "secret_scan" | "normalization" | "persistence" | "completed" | "failed" | "cancelled")
- `progress`: Number (0-100)
- `cancellationRequested`: Boolean
- `cancelledAt`: Date
- `scannerVersions`: Array of `{ scanner, version, rulesetVersion }`
- `scanners`: Array of `{ scanner, version, rulesetVersion, status, findingsCount, durationMs, error }`
- `errorCode`: String
- `errorMessage`: String
- `summary`: Object `{ total, critical, high, medium, low, info }`
- `createdAt`, `startedAt`, `completedAt`: Date
- Indexes: `{ repositoryId: 1, createdAt: -1 }`, `{ status: 1, createdAt: -1 }`

### 4. `findings` (Canonical Finding Model)
- `_id`: ObjectId
- `scanId`: ObjectId (Ref Scan)
- `scanner`: String ("eslint" | "semgrep-security" | "gitleaks" | "osv-dependency-audit")
- `ruleId`: String
- `title`: String
- `message`: String
- `severity`: String ("critical" | "high" | "medium" | "low" | "info" | "unknown")
- `category`: String ("security" | "correctness" | "quality" | "secrets" | "dependencies")
- `filePath`: String
- `startLine`, `endLine`, `startColumn`, `endColumn`: Number
- `codeAnchor`: String
- `codeSnippet`: String
- `sanitizedSnippet`: String (Masked secrets)
- `toolName`: String ("eslint" | "semgrep" | "gitleaks" | "osv-dependency-audit")
- `toolVersion`: String (e.g. "8.57.0", "semgrep-1.78.0", "gitleaks-v8.18.4", "osv-v1.4.0")
- `rulesetVersion`: String
- `advisorySource`: String ("OSV", "NVD", "GHSA")
- `advisoryId`: String (CVE-xxxx-xxxx / GHSA-xxxx)
- `confidence`: String ("low" | "medium" | "high")
- `cwe`: Array of Strings (e.g. ["CWE-89"])
- `owasp`: Array of Strings (e.g. ["A03:2021-Injection"])
- `commitSha`: String
- `fingerprintVersion`: String ("v1")
- `fingerprint`: String (SHA-256 fingerprint hash)
- `stableKey`: String (Repository-level stable finding key)
- `source`: String ("static-analysis" | "dependency-tool" | "ai-hypothesis")
- `scannerEvidenceRef`: String
- `ruleExplanation`: String
- `rawMetadata`: Object
- `sanitizedRawMetadata`: Object
- `status`: String ("OPEN" | "TRIAGED" | "FIXED" | "ACCEPTED_RISK" | "FALSE_POSITIVE" | "SUPPRESSED" | "PERSISTENT")
- `resolvedAt`, `suppressedUntil`: Date
- `state`: String ("open" | "accepted" | "risk-accepted" | "false-positive" | "fixed" | "suppressed")
- `assignee`: String
- `comments`: Array of `{ author, text, createdAt }`
- `createdAt`, `updatedAt`: Date
- Indexes: `{ scanId: 1, severity: 1 }`, `{ scanId: 1, fingerprint: 1 }`, `{ stableKey: 1 }`

### 5. `aiReviews`
- `_id`: ObjectId
- `findingId`: ObjectId (Ref Finding)
- `provider`: String ("gemini (gemini-1.5-flash)" | "codesense-deterministic-engine")
- `providerMode`: String ("model" | "deterministic_fallback")
- `model`: String ("gemini-1.5-flash")
- `promptVersion`: String ("v1.2")
- `schemaVersion`: String ("1.0")
- `summary`: String
- `whyItMatters`: String
- `suggestedFix`: String (Unified diff format)
- `assumptions`: Array of Strings
- `confidence`: String ("low" | "medium" | "high")
- `validationSteps`: Array of Strings
- `evidenceRefs`: Array of Strings
- `latencyMs`: Number
- `tokenUsage`: Object `{ promptTokens, completionTokens, totalTokens }`
- `status`: String ("completed")
- `createdAt`: Date
- Indexes: `{ findingId: 1, createdAt: -1 }`

### 6. `patchValidations`
- `_id`: ObjectId
- `findingId`: ObjectId (Ref Finding)
- `scanId`: ObjectId (Ref Scan)
- `patchHash`: String (SHA-256 of candidate diff)
- `targetFile`: String
- `checks`: Array of `{ name, passed, message, timestamp }`
- `outcome`: String ("passed" | "failed" | "inconclusive")
- `durationMs`: Number
- `logsReference`: String
- `validatedAt`, `createdAt`, `updatedAt`: Date
- Indexes: `{ findingId: 1, createdAt: -1 }`

### 7. `auditEvents`
- `_id`: ObjectId
- `actor`: String (User ID or system)
- `action`: String ("scan.queued", "scan.cancelled", "finding.triaged", "patch.validated", "auth.login")
- `resource`: String (Resource identifier, e.g. "finding:123")
- `timestamp`: Date
- `requestId`: String
- `safeMetadata`: Object
- Indexes: `{ actor: 1, timestamp: -1 }`, `{ action: 1, timestamp: -1 }`, `{ resource: 1, timestamp: -1 }`
