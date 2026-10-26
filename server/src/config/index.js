
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireAuth } from "../middleware/auth.middleware.js";

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
  mongoUri: getEnv("MONGODB_URI"),
  sessionSecret: getEnv("SESSION_SECRET"),
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
  
  // AI and background jobs
    llmApiKey: getEnv("LLM_API_KEY"),
    redisUrl: getEnv("REDIS_URL", "redis://localhost:6379"),

  // Logging
  logLevel: getEnv("LOG_LEVEL", "info"),
};
