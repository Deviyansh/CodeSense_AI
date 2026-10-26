# CodeSense AI — Deployment & Operations

## 1. Local Development Setup
1. Clone repository and install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

3. Run full-stack application:
- Development mode (concurrent):
  - Server: `npm run dev --prefix server` (Port 5000)
  - Client: `npm run dev --prefix client` (Port 5173 with Vite proxy)
- Self-contained production mode:
  - `npm run build`
  - `npm start --prefix server` (Serves both API and optimized React frontend at `http://localhost:5000`)

## 2. Production Docker Deployment
Docker Compose topology:
- Web API & Analysis worker
- MongoDB Atlas / local replica
- Redis queue broker (required future work; not implemented in the current source)


## 3. Current production limitations (must be addressed before public launch)
- The scan queue is process-local and loses queued work if the server restarts. A durable Redis/BullMQ worker setup is required for reliable production processing.
- Repository intake currently supports public GitHub repositories and the built-in demo fixture. Private-repository OAuth/GitHub App authorization is not implemented.
- Scanner adapters are in-app heuristic rules, not the official ESLint, Semgrep, Gitleaks, or dependency-audit executables.
- Add rate limiting, abuse controls, explicit privacy consent for external LLM processing, and end-to-end production smoke tests before opening registration publicly.
- In production, `MONGODB_URI` must point to a reachable MongoDB deployment and `SESSION_SECRET` must be a random value of at least 32 characters. The server now refuses to start when MongoDB is unavailable.
