# CodeSense AI — Security Threat Model & Privacy Controls

## 1. Untrusted Input Boundary
Repository content, file paths, and archive contents are treated as strictly untrusted:
- **Path Traversal Mitigation**: File paths are normalized; absolute paths and `..` segments are rejected before workspace resolution.
- **Resource Limits**: Intake enforces maximum file count (500 files) and maximum file size (500 KB per file) to prevent memory exhaustion and archive bombs.
- **No Arbitrary Code Execution**: Official and heuristic scanners inspect code via AST and pattern matching rather than executing repository build scripts or lifecycle hooks.
- **Prompt Injection Defense**: Repository content is structurally enclosed in strict boundary tags (`=== BEGIN UNTRUSTED REPOSITORY CONTEXT ===`) to prevent instruction hijacking.

## 2. Authentication & Authorization (IDOR Protection)
- Passwords hashed using bcrypt with salt rounds.
- JWT tokens signed using server secrets and delivered via `HttpOnly`, `SameSite=Lax` cookies.
- Every API endpoint accessing repositories, scans, findings, or patch validation reports performs database-level ownership checks against the authenticated user ID (`req.user.id`).

## 3. Secret Redaction & Safe Logging
- Structured JSON logging redacts tokens, authorization headers, passwords, and API keys.
- Secret findings (e.g. AWS access keys, GitHub PATs, Slack tokens, Stripe keys, and DB credentials) are sanitized using automated pattern masking before storage, export, and model transmission.
- Raw secret values are NEVER sent to external LLMs.

## 4. Privacy Consent & LLM Boundary
- **Explicit User Consent (`aiConsent`)**: Source code snippets are never sent to external AI providers (Gemini) unless the authenticated developer explicitly opts in.
- **Deterministic Mode**: When AI consent is disabled or no API key is configured, the platform runs strictly local deterministic analysis and grounded remediation.
- **Data Minimization**: Only the bounded snippet corresponding to a verified finding is transmitted.

## 5. Controlled Patch Validation Sandbox
- AI-generated candidate diffs are proposals, not trusted code.
- Every patch validation executes in an isolated temporary workspace with:
  - Path boundary and directory traversal verification.
  - JavaScript syntax and parsing checks.
  - Scanner rule reruns to confirm vulnerability elimination.
  - Security regression checks.
- Patches are never auto-merged to connected repositories; explicit human approval is required.
