# Pre-GitHub Audit — CodeSense AI

## Status
**Not production-ready yet.** This source pass removes several misleading failure modes, but it does not complete private GitHub OAuth, durable queueing, rate limiting, or full live-MongoDB integration testing.

## Findings and changes in this pass

### Fixed in this source pass
- Production startup now requires a valid `SESSION_SECRET` (32+ characters and not the example placeholder) and a valid MongoDB URI.
- Production startup fails if MongoDB cannot be reached instead of silently starting with volatile storage. Model adapters now refuse in-memory fallback in production, including after a later database disconnect.
- Login and registration now set an HttpOnly session cookie without returning the JWT in the JSON response. The frontend no longer stores auth tokens in `localStorage`; requests use cookies.
- Real GitHub repository scan failures no longer silently substitute the demo fixture. GitHub calls have timeouts and explicit error responses; only the explicitly seeded fixture uses fixture content.
- The integration test uses the fixture explicitly, avoiding accidental network requests.
- `.gitignore` now excludes `.env.*` files while allowing `.env.example`.
- CORS allows the configured client origin, with localhost origins only in non-production mode.
- README/deployment docs now describe the current scanner and queue limitations accurately.

### Verified
- `npm run test --prefix server`: **11 tests passed, 0 failed** in the available local test run. These tests use the in-memory test/development store; they do **not** prove Atlas connectivity.
- Node syntax checks passed for the changed server JavaScript files.
- A production frontend build could not be verified from the uploaded archive because its included `node_modules` tree was incomplete for this runtime (the Rollup platform optional dependency was missing). Do a clean `npm install` after cloning, then run the build. Do not commit `node_modules`.

## Remaining blockers before public launch

### P0 — Must complete before real users
1. Configure MongoDB Atlas, restrict network access, create a least-privilege database user, set `MONGODB_URI` in the deployment platform, and run a live database smoke test for registration, login, repository creation, scans, and restart persistence. Never commit the URI.
2. Implement GitHub App/OAuth authorization for private repositories, token storage/rotation, permission minimization, revocation, and user-consent screens. Current real-repository intake is public-repository-only.
3. Replace the process-local scan queue with durable Redis/BullMQ (or another persistent queue), add retry/dead-letter handling, and run the worker separately before multi-instance deployment.
4. Add rate limiting and abuse controls to registration/login, scan creation, report export, and AI review endpoints.
5. Add an explicit privacy notice and consent for sending source snippets to Gemini or another external model. Add request timeouts, payload bounds, and provider error handling.
6. Integrate and verify actual scanner tools or clearly present all current results as heuristic checks. The present adapters do not execute the official ESLint, Semgrep, Gitleaks, or complete dependency advisory database.

### P1 — Required reliability work
- Add tests against a real disposable MongoDB instance and test restart persistence, unique indexes, concurrent registration, and DB disconnect behavior.
- Add end-to-end frontend build and browser tests; the uploaded archive did not contain a complete install tree for a reliable production build check.
- Add structured API rate limits, request-size and scan-cost limits, pagination enforcement, and monitoring/alerts.
- Verify cookie settings behind the deployment proxy (`Secure`, `HttpOnly`, `SameSite`) and add CSRF protections if deployment topology or cookie policy requires them.
- Add durable scan status recovery, cancellation, and worker crash recovery.
- Add retention/deletion controls for repositories, scan results, code snippets, and AI review records.

## GitHub hygiene
The uploaded ZIP included `node_modules`, `client/dist`, and a `.git` directory. The included Git repository had no commits and no tracked files in its index, so no existing Git history was found in this archive. The clean source bundle should exclude `.git`, `node_modules`, and build output; the updated `.gitignore` protects them when you initialize and commit the repository.

## Environment variables needed for deployment
- `NODE_ENV=production`
- `PORT` (provided by most hosting platforms)
- `CLIENT_ORIGIN` (the exact deployed frontend origin)
- `MONGODB_URI` (MongoDB Atlas connection string; keep private)
- `SESSION_SECRET` (random 32+ character secret; keep private)
- `LLM_API_KEY` only if enabling Gemini calls; keep private and document external code processing

Do not paste credentials into GitHub, chat, screenshots, or issue trackers. Enter them only in the hosting provider's secret/environment settings.
