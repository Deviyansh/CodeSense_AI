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
| `GET` | `/health` | Server uptime and health check | No | 200 |
| `POST` | `/auth/register` | Register user account | No | 201 |
| `POST` | `/auth/login` | Authenticate and issue JWT cookie | No | 200 |
| `POST` | `/auth/logout` | Revoke session cookie | No | 200 |
| `GET` | `/auth/me` | Fetch authenticated session | Yes | 200 |
| `GET` | `/repositories` | List repositories owned by user | Yes | 200 |
| `POST` | `/repositories` | Connect a repository | Yes | 201 |
| `POST` | `/repositories/seed-demo` | Add pre-seeded vulnerable fixture repo | Yes | 201 |
| `GET` | `/repositories/:id` | Get repository details | Yes | 200 |
| `POST` | `/repositories/:id/scans` | Queue a commit-pinned scan | Yes | 202 |
| `GET` | `/repositories/:id/scans` | List scan history for repository | Yes | 200 |
| `GET` | `/scans/:id` | Fetch scan status, progress, stage, & summary | Yes | 200 |
| `GET` | `/scans/:id/findings` | Get paginated, filtered findings for scan | Yes | 200 |
| `GET` | `/scans/:id/report` | Export report as JSON or Markdown | Yes | 200 |
| `GET` | `/scans/:id/diff/:compareScanId`| Commit-to-commit comparison | Yes | 200 |
| `GET` | `/findings/:id` | Get finding details and evidence | Yes | 200 |
| `POST` | `/findings/:id/review` | Generate structured AI explanation & patch | Yes | 200 |
