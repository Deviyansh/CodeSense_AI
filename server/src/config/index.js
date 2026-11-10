import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

// Load the root project's .env file.
dotenv.config({
  path: path.resolve(currentDir, "../../../.env"),
});

function getEnv(name, fallback = "") {
  return process.env[name] || fallback;
}

export const config = {
  env: getEnv("NODE_ENV", "development"),
  port: Number(getEnv("PORT", "5000")),
  clientOrigin: getEnv("CLIENT_ORIGIN", "http://localhost:5173"),

  // Database and authentication
  mongoUri: getEnv("MONGODB_URI", "mongodb://localhost:27017/codesense-ai"),
  sessionSecret: getEnv(
    "SESSION_SECRET",
    "codesense-development-session-secret-at-least-32-chars-long!"
  ),
  jwtIssuer: getEnv("JWT_ISSUER", "codesense-ai"),
  jwtAudience: getEnv("JWT_AUDIENCE", "codesense-ai-web"),

  // GitHub App and OAuth
  githubAppId: getEnv("GITHUB_APP_ID"),
  githubPrivateKeyPath: getEnv("GITHUB_PRIVATE_KEY_PATH"),
  githubAppSlug: getEnv("GITHUB_APP_SLUG"),
  githubCallbackUrl: getEnv(
    "GITHUB_CALLBACK_URL",
    "http://localhost:5000/api/v1/github/callback"
  ),
  githubClientId: getEnv("GITHUB_CLIENT_ID"),
  githubClientSecret: getEnv("GITHUB_CLIENT_SECRET"),
  githubTokenEncryptionKey: getEnv("GITHUB_TOKEN_ENCRYPTION_KEY"),

  // AI and background jobs
  llmProvider: getEnv("LLM_PROVIDER", "gemini"),
  llmApiKey: getEnv("LLM_API_KEY"),
  llmModel: getEnv("LLM_MODEL", "gemini-1.5-flash"),
  redisUrl: getEnv("REDIS_URL", "redis://localhost:6379"),
  scanQueueName: getEnv("SCAN_QUEUE_NAME", "codesense-scans"),
  scanWorkerConcurrency: Number(getEnv("SCAN_WORKER_CONCURRENCY", "2")),

  // Scanner policy
  maxRepositoryFiles: Number(getEnv("MAX_REPOSITORY_FILES", "500")),
  maxFileSizeKb: Number(getEnv("MAX_FILE_SIZE_KB", "500")),
  scanTimeoutSeconds: Number(getEnv("SCAN_TIMEOUT_SECONDS", "300")),
  scannerNetworkAccess: getEnv("SCANNER_NETWORK_ACCESS", "false") === "true",

  // Logging
  logLevel: getEnv("LOG_LEVEL", "info"),
};
