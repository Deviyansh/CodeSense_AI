
import fs from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "node:url";
import { config } from "../../config/index.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function getPrivateKey() {
  const configuredPath = config.githubPrivateKeyPath;

  if (!configuredPath) {
    throw new Error("GitHub App private-key path is not configured.");
  }

  const keyPath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(currentDir, "../../../../", configuredPath);

  try {
    return fs.readFileSync(keyPath, "utf8");
  } catch {
    throw new Error("GitHub App private key could not be loaded.");
  }
}

export function createGitHubAppJwt() {
  if (!config.githubAppId) {
    throw new Error("GitHub App ID is not configured.");
  }

  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    {
      iat: now - 60,
      exp: now + 8 * 60,
      iss: config.githubAppId,
    },
    getPrivateKey(),
    { algorithm: "RS256" }
  );
}

export async function createInstallationToken(installationId) {
  const id = String(installationId || "");

  if (!/^\d+$/.test(id)) {
    const error = new Error("A valid GitHub installation ID is required.");
    error.statusCode = 400;
    error.code = "INVALID_GITHUB_INSTALLATION_ID";
    throw error;
  }

  const appJwt = createGitHubAppJwt();

  const response = await fetch(
    `https://api.github.com/app/installations/${encodeURIComponent(id)}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "CodeSense-AI",
      },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) {
    const error = new Error(
      response.status === 404 || response.status === 403
        ? "GitHub installation was not found or is not accessible to this app."
        : "GitHub could not issue an installation token."
    );

    error.statusCode = response.status === 404 ? 404 : 502;
    error.code = "GITHUB_INSTALLATION_TOKEN_FAILED";
    throw error;
  }

  const data = await response.json();

  if (!data.token || !data.expires_at) {
    throw new Error("GitHub returned an invalid installation token response.");
  }

  return {
    token: data.token,
    expiresAt: new Date(data.expires_at),
  };
}


export async function getGitHubInstallation(installationId) {
  const id = String(installationId || "");

  if (!/^\d+$/.test(id)) {
    const error = new Error("A valid GitHub installation ID is required.");
    error.statusCode = 400;
    error.code = "INVALID_GITHUB_INSTALLATION_ID";
    throw error;
  }

  const appJwt = createGitHubAppJwt();

  let response;

  try {
    response = await fetch(
      `https://api.github.com/app/installations/${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "CodeSense-AI",
        },
        signal: AbortSignal.timeout(10000),
      }
    );
  } catch {
    const error = new Error("Could not contact GitHub to verify the installation.");
    error.statusCode = 502;
    error.code = "GITHUB_UNAVAILABLE";
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      response.status === 404
        ? "This installation does not belong to the configured GitHub App."
        : "GitHub could not verify the installation."
    );

    error.statusCode = response.status === 404 ? 404 : 502;
    error.code = "GITHUB_INSTALLATION_VERIFICATION_FAILED";
    throw error;
  }

  const data = await response.json();

  if (
    String(data.id) !== id ||
    !data.account?.login ||
    !["User", "Organization"].includes(data.account?.type)
  ) {
    const error = new Error("GitHub returned invalid installation details.");
    error.statusCode = 502;
    error.code = "GITHUB_INSTALLATION_RESPONSE_INVALID";
    throw error;
  }

  return {
    installationId: String(data.id),
    accountLogin: data.account.login,
    accountType: data.account.type,
    repositorySelection:
      data.repository_selection === "all" ? "all" : "selected",
    suspendedAt: data.suspended_at ? new Date(data.suspended_at) : null,
  };
}

