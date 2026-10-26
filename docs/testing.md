# CodeSense AI — Testing Strategy

## 1. Automated Test Suite
The automated test suite runs via Node.js native test runner:
```bash
npm run test --prefix server
```

### Verified Test Cases:
1. `GET /api/v1/health`: Checks API readiness and status response.
2. `POST /api/v1/auth/register`: Validates password policy, email normalization, and unique email constraints.
3. `POST /api/v1/auth/login`: Tests successful authentication and bad credential rejection.
4. Protected API Route Guard: Ensures missing credentials return `401 AUTH_REQUIRED`.
5. Repository Creation: Verifies authenticated user isolation.
6. Cross-User IDOR Protection: Verifies User A's repositories cannot be read or manipulated by User B.
7. Asynchronous Scan Dispatch: Checks `POST /repositories/:id/scans` returns `202 Accepted` with a pinned commit SHA.
8. Background Analysis Pipeline: Confirms worker executes ESLint, Semgrep, Gitleaks, and Dependency scanners, calculating stable SHA-256 fingerprints.
9. Structured AI Review: Asserts summary, why-it-matters, unified diff patch, assumptions, and validation steps.
10. Multi-Format Report Export: Validates JSON and Markdown report generation.

## 2. Seeded Fixture Suite
Located in `fixtures/sample-vulnerable-repo/`, seeded with intentional, realistic vulnerabilities:
- SQL Injection via string concatenation
- Child Process Command Injection
- Hardcoded JWT signing secret
- Plaintext AWS credentials & MongoDB connection string
- Vulnerable package dependencies (lodash, jsonwebtoken, axios)
- Loose equality and eval() usage
