import crypto from "crypto";
import { Repository } from "../models/repository.model.js";
import { Scan } from "../models/scan.model.js";
import { createRepositorySchema } from "../validators/schemas.js";
import { githubApiRequest } from "../services/github/github-api.client.js";
import { getUserInstallationToken } from "../services/github/github-installation.service.js";
import { verifyRepositoryAccess } from "../services/github/github.service.js";

export async function listRepositories(req, res, next) {
  try {
    const repos = await Repository.find({
      ownerId: req.user.id,
    }).sort({ updatedAt: -1 });

    const items = await Promise.all(
      repos.map(async (repo) => {
        const repoObj = repo.toObject
          ? repo.toObject()
          : { ...repo };

        const [repoScans, access] = await Promise.all([
          Scan.find({ repositoryId: repo._id })
            .sort({ createdAt: -1 }),
          verifyRepositoryAccess(repo).then(
            (result) => result,
            (error) => ({
              accessible: null,
              reason: error.code || "GITHUB_ACCESS_CHECK_FAILED",
            })
          ),
        ]);

        const lastScan = repoScans[0] || null;

        return {
          ...repoObj,
          connected: access.accessible,
          connectionStatus:
            access.accessible === true
              ? "connected"
              : access.accessible === false
                ? "disconnected"
                : "unknown",
          connectionError:
            access.accessible === false
              ? access.reason
              : null,
          lastScan: lastScan
            ? {
                id: String(lastScan._id),
                status: lastScan.status,
                commitSha: lastScan.commitSha,
                totalFindings: lastScan.summary?.total || 0,
                createdAt: lastScan.createdAt,
              }
            : null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: items,
      meta: { requestId: req.id },
    });
  } catch (err) {
    next(err);
  }
}


export async function createRepository(req, res, next) {
  try {
    const input = createRepositorySchema.parse(req.body);
    const installationId = String(input.installationId || "");
    const providerRepoId = String(input.providerRepoId || "");
    const fullName = String(input.fullName || "");

    if (
      !/^\d+$/.test(installationId) ||
      !/^\d+$/.test(providerRepoId) ||
      !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_GITHUB_REPOSITORY",
          message: "Select a valid repository from your GitHub App installation.",
        },
        meta: { requestId: req.id },
      });
    }

    const { token } = await getUserInstallationToken(
      req.user.id,
      installationId
    );

    const encodedFullName = fullName
      .split("/")
      .map(encodeURIComponent)
      .join("/");

    const verified = await githubApiRequest(
      `/repos/${encodedFullName}`,
      { token }
    );

    if (
      String(verified.id) !== providerRepoId ||
      verified.full_name?.toLowerCase() !== fullName.toLowerCase()
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "GITHUB_REPOSITORY_MISMATCH",
          message: "GitHub could not verify the selected repository.",
        },
        meta: { requestId: req.id },
      });
    }

    const existing = await Repository.findOne({
      ownerId: req.user.id,
      provider: "github",
      providerRepoId,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: "REPOSITORY_CONFLICT",
          message: "You have already connected this repository.",
        },
        meta: { requestId: req.id },
      });
    }

    const repo = await Repository.create({
      ownerId: req.user.id,
      provider: "github",
      providerRepoId: String(verified.id),
      fullName: verified.full_name,
      defaultBranch: verified.default_branch || "main",
      visibility: verified.private ? "private" : "public",
      installationOrCredentialRef: installationId,
    });

    return res.status(201).json({
      success: true,
      data: repo,
      meta: { requestId: req.id },
    });
  } catch (err) {
    if (err.name === "ZodError") {
      err.statusCode = 400;
      err.code = "VALIDATION_ERROR";
      err.message = err.errors.map((e) => e.message).join(", ");
    }
    next(err);
  }
}


export async function getRepositoryById(req, res, next) {
  try {
    const repo = await Repository.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
    });

    if (!repo) {
      return res.status(404).json({
        success: false,
        error: {
          code: "REPOSITORY_NOT_FOUND",
          message: "Repository not found or access denied",
        },
        meta: { requestId: req.id },
      });
    }

    res.status(200).json({
      success: true,
      data: repo,
      meta: { requestId: req.id },
    });
  } catch (err) {
    next(err);
  }
}

export async function seedDemoRepository(req, res, next) {
  try {
    const fullName = "demo/sample-ecommerce-api";
    let repo = await Repository.findOne({ ownerId: req.user.id, fullName });

    if (!repo) {
      repo = await Repository.create({
        ownerId: req.user.id,
        provider: "github",
        providerRepoId: "fixture-ecommerce-01",
        fullName,
        defaultBranch: "main",
        visibility: "public",
      });
    }

    res.status(201).json({
      success: true,
      data: repo,
      meta: { requestId: req.id },
    });
  } catch (err) {
    next(err);
  }
}

export async function removeRepository(req, res, next) {
  try {
    const repositoryId = req.params.id;

    // Ensure the repository belongs to the authenticated user.
    const repository = await Repository.findOne({
      _id: repositoryId,
      ownerId: req.user.id,
    });

    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          code: "REPOSITORY_NOT_FOUND",
          message: "Repository not found or access denied.",
        },
        meta: { requestId: req.id },
      });
    }

    // Delete only the repository connection.
    // Scan and finding records are deliberately preserved.
    const result = await Repository.deleteMany({
      _id: repositoryId,
      ownerId: req.user.id,
    });

    if (!result.deletedCount) {
      return res.status(404).json({
        success: false,
        error: {
          code: "REPOSITORY_NOT_FOUND",
          message: "Repository was already removed.",
        },
        meta: { requestId: req.id },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: repositoryId,
        removed: true,
      },
      meta: { requestId: req.id },
    });
  } catch (err) {
    next(err);
  }
}
