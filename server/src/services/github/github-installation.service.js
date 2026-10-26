import { GitHubInstallation } from "../../models/githubInstallation.model.js";
import { createInstallationToken } from "./github-app-auth.service.js";

export async function getUserInstallation(ownerId, installationId) {
  const id = String(installationId || "");

  if (!/^\d+$/.test(id)) {
    const error = new Error("A valid GitHub installation ID is required.");
    error.statusCode = 400;
    error.code = "INVALID_GITHUB_INSTALLATION_ID";
    throw error;
  }

  const installation = await GitHubInstallation.findOne({
    ownerId,
    installationId: id,
  });

  if (!installation) {
    const error = new Error(
      "GitHub installation was not found for this CodeSense AI account."
    );
    error.statusCode = 404;
    error.code = "GITHUB_INSTALLATION_NOT_FOUND";
    throw error;
  }

  if (installation.suspendedAt) {
    const error = new Error("This GitHub installation is suspended.");
    error.statusCode = 403;
    error.code = "GITHUB_INSTALLATION_SUSPENDED";
    throw error;
  }

  return installation;
}

export async function getUserInstallationToken(ownerId, installationId) {
  const installation = await getUserInstallation(ownerId, installationId);
  const tokenData = await createInstallationToken(installation.installationId);

  return {
    installation,
    token: tokenData.token,
    expiresAt: tokenData.expiresAt,
  };
}
