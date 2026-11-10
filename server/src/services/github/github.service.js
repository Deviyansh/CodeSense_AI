
import { getSampleFixtureFiles } from "./fixtures.data.js";
import {
  githubApiRequest,
  listInstallationRepositories,
} from "./github-api.client.js";
import { getUserInstallationToken } from "./github-installation.service.js";

const GITHUB_API = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_FILES = 100;
const MAX_FILE_BYTES = 500 * 1024;

const CODE_EXTENSIONS = new Set([
  ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".py", ".java", ".go",
  ".rb", ".php", ".cs", ".cpp", ".c", ".h", ".hpp", ".rs", ".kt", ".swift",
  ".json", ".yml", ".yaml", ".toml", ".xml", ".sh", ".sql", ".env.example",
]);

function githubError(status, message) {
  const error = new Error(message);

  error.statusCode =
    status === 404 ? 404 : status === 403 ? 429 : 502;

  error.code =
    status === 404
      ? "GITHUB_REPOSITORY_NOT_FOUND_OR_PRIVATE"
      : status === 403
        ? "GITHUB_RATE_LIMITED_OR_FORBIDDEN"
        : "GITHUB_API_ERROR";

  return error;
}

async function githubGet(url) {
  let response;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "CodeSense-AI",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    const error = new Error(
      "Could not reach GitHub. Check network access and try again."
    );
    error.statusCode = 502;
    error.code = "GITHUB_UNAVAILABLE";
    error.cause = cause;
    throw error;
  }

  if (!response.ok) {
    throw githubError(
      response.status,
      `GitHub request failed with HTTP ${response.status}. Verify repository access and the repository name.`
    );
  }

  return response.json();
}

function isFixture(repository) {
  return String(repository.providerRepoId || "").startsWith("fixture-");
}

function validateFullName(repository) {
  const fullName = String(repository.fullName || "");

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName)) {
    const error = new Error(
      "Repository must be provided as owner/repository."
    );
    error.statusCode = 400;
    error.code = "INVALID_REPOSITORY_NAME";
    throw error;
  }

  return fullName;
}

function installationIdFor(repository) {
  const id = String(repository.installationOrCredentialRef || "");
  return /^\d+$/.test(id) ? id : null;
}

async function getRepositoryAccess(repository) {
  const installationId = installationIdFor(repository);

  if (!installationId) {
    return { token: null };
  }

  if (!repository.ownerId) {
    const error = new Error("Repository owner could not be verified.");
    error.statusCode = 403;
    error.code = "REPOSITORY_OWNER_REQUIRED";
    throw error;
  }

  const { token } = await getUserInstallationToken(
    repository.ownerId,
    installationId
  );

  return { token };
}

/**
 * Verify that the repository is explicitly accessible through the
 * saved GitHub App installation, not merely publicly readable.
 */
export async function verifyRepositoryAccess(repository) {
  if (isFixture(repository)) {
    return { accessible: true, reason: null };
  }

  let fullName;

  try {
    fullName = validateFullName(repository);
  } catch (error) {
    return {
      accessible: false,
      reason: error.code || "INVALID_REPOSITORY_NAME",
    };
  }

  let token;

  try {
    const access = await getRepositoryAccess(repository);
    token = access.token;
  } catch (error) {
    if (
      [
        "GITHUB_INSTALLATION_NOT_FOUND",
        "GITHUB_INSTALLATION_SUSPENDED",
        "GITHUB_INSTALLATION_AUTH_INVALID",
        "GITHUB_INSTALLATION_AUTH_REQUIRED",
        "GITHUB_INSTALLATION_TOKEN_FAILED",
      ].includes(error.code)
    ) {
      return {
        accessible: false,
        reason: error.code,
      };
    }

    throw error;
  }

  if (!token) {
    return {
      accessible: false,
      reason: "GITHUB_INSTALLATION_TOKEN_UNAVAILABLE",
    };
  }

  try {
    const repositories = await listInstallationRepositories(token);

    const accessible = repositories.some(
      (repo) =>
        String(repo.id) === String(repository.providerRepoId) &&
        repo.full_name?.toLowerCase() === fullName.toLowerCase()
    );

    if (!accessible) {
      return {
        accessible: false,
        reason: "GITHUB_REPOSITORY_ACCESS_REVOKED",
      };
    }

    return { accessible: true, reason: null };
  } catch (error) {
    if (
      error.statusCode === 401 ||
      error.code === "GITHUB_INSTALLATION_AUTH_INVALID"
    ) {
      return {
        accessible: false,
        reason: "GITHUB_INSTALLATION_AUTH_INVALID",
      };
    }

    // A 403 may be a rate limit; a network failure is not proof of revocation.
    throw error;
  }
}

async function getJson(path, token) {
  if (token) {
    return githubApiRequest(path, { token });
  }

  return githubGet(`${GITHUB_API}${path}`);
}

export async function resolveCommitSha({
  repository,
  branch = "main",
}) {
  if (isFixture(repository)) {
    return "e8a49c2b8478f993d0473a38411b0e9f1a0e8821";
  }

  const fullName = validateFullName(repository);
  const { token } = await getRepositoryAccess(repository);

  if (!token) {
    const error = new Error(
      "A valid GitHub App installation is required to scan this repository."
    );
    error.statusCode = 403;
    error.code = "GITHUB_INSTALLATION_AUTH_REQUIRED";
    throw error;
  }

  const encodedFullName = fullName
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const encodedBranch = String(branch)
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const data = await githubApiRequest(
    `/repos/${encodedFullName}/commits/${encodedBranch}`,
    { token }
  );

  if (!data?.sha) {
    throw githubError(502, "GitHub did not return a commit SHA for this branch.");
  }

  return data.sha;
}

export async function fetchRepositoryFiles({ repository, commitSha }) {
  if (isFixture(repository)) {
    return getSampleFixtureFiles();
  }

  const fullName = validateFullName(repository);
  const { token } = await getRepositoryAccess(repository);

  // Never fall back to anonymous access for an app-connected repository.
  if (!token) {
    const error = new Error(
      "A valid GitHub App installation is required to scan this repository."
    );
    error.statusCode = 403;
    error.code = "GITHUB_INSTALLATION_AUTH_REQUIRED";
    throw error;
  }

  const encodedFullName = fullName
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const treeData = await githubApiRequest(
    `/repos/${encodedFullName}/git/trees/${encodeURIComponent(commitSha)}?recursive=1`,
    { token }
  );

  if (treeData.truncated) {
    const error = new Error(
      "GitHub returned a truncated repository tree; this scan cannot guarantee complete coverage."
    );
    error.statusCode = 422;
    error.code = "GITHUB_TREE_TRUNCATED";
    throw error;
  }

  const candidates = (treeData.tree || [])
    .filter(
      (item) =>
        item.type === "blob" &&
        !item.path.split("/").some((part) =>
          ["node_modules", ".git", "dist", "build", "coverage"].includes(part)
        )
    )
    .filter((item) => {
      const filePath = item.path.toLowerCase();
      return [...CODE_EXTENSIONS].some((ext) => filePath.endsWith(ext));
    })
    .filter((item) => item.sha && Number.isFinite(item.size))
    .slice(0, MAX_FILES);

  const files = [];

  for (const item of candidates) {
    try {
      if (item.size > MAX_FILE_BYTES) continue;

      const blob = await githubApiRequest(
        `/repos/${encodedFullName}/git/blobs/${encodeURIComponent(item.sha)}`,
        { token }
      );

      if (
        blob.encoding !== "base64" ||
        typeof blob.content !== "string"
      ) {
        continue;
      }

      const content = Buffer.from(blob.content, "base64").toString("utf8");

      if (Buffer.byteLength(content, "utf8") <= MAX_FILE_BYTES) {
        files.push({ path: item.path, content });
      }
    } catch (error) {
      // Preserve access/rate-limit failures instead of hiding them as
      // individual unreadable files.
      if (
        error.statusCode === 401 ||
        error.statusCode === 403 ||
        error.code === "GITHUB_INSTALLATION_AUTH_INVALID"
      ) {
        throw error;
      }
    }
  }

  if (files.length === 0) {
    const error = new Error(
      "No supported source files could be fetched. Verify the repository contents and the GitHub App's Contents read permission."
    );
    error.statusCode = 422;
    error.code = "NO_SOURCE_FILES";
    throw error;
  }

  return files;
}
