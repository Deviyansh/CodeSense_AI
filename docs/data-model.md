# CodeSense AI — MongoDB Data Model

## Collections

### 1. `users`
- `_id`: ObjectId
- `name`: String
- `emailNormalized`: String (Unique index, lowercase)
- `passwordHash`: String (Bcrypt salted hash)
- `createdAt`: Date
- `updatedAt`: Date

### 2. `repositories`
- `_id`: ObjectId
- `ownerId`: ObjectId (Ref User)
- `provider`: String ("github")
- `providerRepoId`: String
- `fullName`: String (e.g. "octocat/hello-world")
- `defaultBranch`: String (default: "main")
- `visibility`: String ("public" | "private")
- `installationOrCredentialRef`: String
- `createdAt`: Date
- `updatedAt`: Date
- Indexes: `{ ownerId: 1, fullName: 1 }`

### 3. `scans`
- `_id`: ObjectId
- `repositoryId`: ObjectId (Ref Repository)
- `requestedBy`: ObjectId (Ref User)
- `branch`: String
- `commitSha`: String (Pinned Git commit)
- `status`: String ("queued" | "running" | "completed" | "failed" | "cancelled")
- `stage`: String ("intake" | "static_analysis" | "secret_scan" | "normalization" | "persistence" | "completed" | "failed")
- `progress`: Number (0-100)
- `scannerVersions`: Array of `{ scanner, version, rulesetVersion }`
- `errorCode`: String
- `errorMessage`: String
- `summary`: Object `{ total, critical, high, medium, low, info }`
- `createdAt`, `startedAt`, `completedAt`: Date
- Indexes: `{ repositoryId: 1, createdAt: -1 }`

### 4. `findings`
- `_id`: ObjectId
- `scanId`: ObjectId (Ref Scan)
- `scanner`: String ("eslint" | "semgrep-security" | "gitleaks" | "dependency-audit")
- `ruleId`: String
- `title`: String
- `message`: String
- `severity`: String ("critical" | "high" | "medium" | "low" | "info" | "unknown")
- `category`: String ("security" | "correctness" | "quality" | "secrets" | "dependencies")
- `filePath`: String
- `startLine`: Number
- `endLine`: Number
- `fingerprint`: String (SHA-256 fingerprint hash)
- `source`: String ("static-analysis" | "dependency-tool" | "ai-hypothesis")
- `codeSnippet`: String
- `rawMetadata`: Object
- `createdAt`: Date
- Indexes: `{ scanId: 1, severity: 1 }`, `{ scanId: 1, fingerprint: 1 }`

### 5. `aiReviews`
- `_id`: ObjectId
- `findingId`: ObjectId (Ref Finding)
- `provider`: String
- `model`: String
- `promptVersion`: String
- `schemaVersion`: String
- `summary`: String
- `whyItMatters`: String
- `suggestedFix`: String (Unified diff format)
- `assumptions`: Array of Strings
- `confidence`: String ("low" | "medium" | "high")
- `validationSteps`: Array of Strings
- `status`: String
- `createdAt`: Date
