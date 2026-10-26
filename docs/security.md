# CodeSense AI — Security Threat Model & Privacy Controls

## 1. Untrusted Input Boundary
Repository content, file paths, and archive contents are treated as strictly untrusted:
- **Path Traversal Mitigation**: File paths are normalized; absolute paths and `..` segments are rejected before workspace resolution.
- **Resource Limits**: Intake enforces maximum file count (500 files) and maximum file size (500 KB per file) to prevent memory exhaustion and archive bombs.
- **No Arbitrary Code Execution**: Scanners inspect code via AST and pattern matching rather than executing application runtimes.
- **Prompt Injection Defense**: Repository content is structurally enclosed as inert data in AI prompts rather than executable instructions.

## 2. Authentication & Authorization (IDOR Protection)
- Passwords hashed using bcrypt with salt rounds.
- JWT tokens signed using server secrets and delivered via `HttpOnly`, `SameSite=Lax` cookies.
- Every API endpoint accessing repositories, scans, or findings performs database-level ownership checks against the authenticated user ID (`req.user.id`).

## 3. Secret Redaction & Safe Logging
- Structured JSON logging redacts tokens, authorization headers, passwords, and API keys.
- Secret findings (e.g. AWS access keys or DB connection passwords) are sanitized before logging.
