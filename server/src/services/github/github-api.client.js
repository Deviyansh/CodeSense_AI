const GITHUB_API = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 10000;

export async function githubApiRequest(
  path,
  { token, method = "GET", body } = {}
) {
  if (!token) {
    const error = new Error("GitHub installation authorization is required.");
    error.statusCode = 401;
    error.code = "GITHUB_INSTALLATION_AUTH_REQUIRED";
    throw error;
  }

  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("://")
  ) {
    throw new Error("Invalid GitHub API path.");
  }

  let response;

  try {
    response = await fetch(`${GITHUB_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "CodeSense-AI",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    const error = new Error("Could not reach the GitHub API.");
    error.statusCode = 502;
    error.code = "GITHUB_UNAVAILABLE";
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      response.status === 404
        ? "The repository or resource was not found or is not accessible."
        : response.status === 401
          ? "GitHub installation authorization has expired or is invalid."
          : response.status === 403
            ? "GitHub denied the request or its API rate limit was reached."
            : "GitHub API request failed."
    );

    error.statusCode =
      response.status === 404 ? 404 :
      response.status === 401 ? 401 :
      response.status === 403 ? 403 : 502;

    error.code =
      response.status === 404 ? "GITHUB_RESOURCE_NOT_FOUND" :
      response.status === 401 ? "GITHUB_INSTALLATION_AUTH_INVALID" :
      response.status === 403 ? "GITHUB_FORBIDDEN_OR_RATE_LIMITED" :
      "GITHUB_API_ERROR";

    throw error;
  }

  return response.json();
}

export async function listInstallationRepositories(token) {
  const repositories = [];
  let page = 1;

  while (true) {
    const result = await githubApiRequest(
      `/installation/repositories?per_page=100&page=${page}`,
      { token }
    );

    const batch = result.repositories || [];
    repositories.push(...batch);

    if (batch.length < 100) {
      break;
    }

    page += 1;
  }

  return repositories;
}
