# CodeSense AI — REST API Contract

Base URL: `/api/v1`

## Response Envelope
All successful API responses return the standard envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "UUID"
  }
}
```

## Error Envelope
All error responses conform to:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  },
  "meta": {
    "requestId": "UUID"
  }
}
```

## Endpoints

| Method | Endpoint | Description | Auth Required | Status Code |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server uptime, readiness, DB mode, and queue diagnostics | No | 200 |
| `POST` | `/auth/register` | Register user account | No | 201 |
| `POST` | `/auth/login` | Authenticate and issue JWT cookie | No | 200 |
| `POST` | `/auth/logout` | Revoke session cookie | No | 200 |
| `GET` | `/auth/me` | Fetch authenticated session | Yes | 200 |
| `PATCH`| `/auth/settings` | Update user AI consent opt-in and preferences | Yes | 200 |
| `GET` | `/repositories` | List repositories owned by user | Yes | 200 |
| `POST` | `/repositories` | Connect a repository | Yes | 201 |
| `POST` | `/repositories/seed-demo` | Add pre-seeded vulnerable fixture repo | Yes | 201 |
| `GET` | `/repositories/:id` | Get repository details | Yes | 200 |
| `POST` | `/repositories/:id/scans` | Queue a commit-pinned scan | Yes | 202 |
| `GET` | `/repositories/:id/scans` | List scan history for repository | Yes | 200 |
| `GET` | `/scans/:id` | Fetch scan status, progress, stage, scanner execution, & summary | Yes | 200 |
| `POST` | `/scans/:id/cancel` | Cancel an active or queued scan job | Yes | 200 |
| `GET` | `/scans/:id/findings` | Get paginated, filtered findings for scan | Yes | 200 |
| `GET` | `/scans/:id/report` | Export report as JSON or Markdown (secrets redacted) | Yes | 200 |
| `GET` | `/scans/:id/diff/:compareScanId`| Commit-to-commit comparison with coverage verification | Yes | 200 |
| `GET` | `/findings/:id` | Get finding details, evidence, and latest validation | Yes | 200 |
| `POST` | `/findings/:id/review` | Generate structured AI explanation & unified diff (consent-gated) | Yes | 200 |
| `POST` | `/findings/:id/triage` | Update triage state (open, accepted_risk, false_positive, fixed, suppressed) | Yes | 200 |
| `POST` | `/findings/:id/patch/validate` | Execute automated patch validation pipeline in isolated sandbox | Yes | 200 |
| `GET` | `/metrics/summary` | Aggregate dashboard metrics (severity, triage, scanner health, trend) | Yes | 200 |
