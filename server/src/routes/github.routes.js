
import { Router } from "express";
import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { config } from "../config/index.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  GitHubInstallState,
  createInstallStateToken,
} from "../models/githubInstallState.model.js";
import { GitHubInstallation } from "../models/githubInstallation.model.js";
import { getGitHubInstallation } from "../services/github/github-app-auth.service.js";
import { githubApiRequest } from "../services/github/github-api.client.js";
import { getUserInstallationToken } from "../services/github/github-installation.service.js";
const router = Router();
const STATE_TTL_MS = 10 * 60 * 1000;
const COOKIE_NAME = "github_install_key";

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeFrontendUrl(path) {
  return new URL(path, config.clientOrigin).toString();
}

function hashesMatch(expected, actual) {
  if (!expected || !actual) return false;
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(actual, "hex");

  return (
    left.length === right.length &&
    left.length > 0 &&
    timingSafeEqual(left, right)
  );
}

function clearInstallCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: config.env === "production",
    sameSite: "lax",
    path: "/api/v1/github",
  });
}

router.get("/status", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      configured: Boolean(
        config.githubAppId &&
        config.githubPrivateKeyPath &&
        config.githubAppSlug
      ),
      integration: "github-app",
    },
  });
});

// Start the installation flow only for authenticated CodeSense AI users.
router.get("/install", requireAuth, async (req, res, next) => {
  try {
    if (
      !config.githubAppId ||
      !config.githubPrivateKeyPath ||
      !config.githubAppSlug
    ) {
      return res.status(503).json({
        success: false,
        error: {
          code: "GITHUB_APP_NOT_CONFIGURED",
          message: "GitHub App installation is not configured.",
        },
      });
    }

    const state = createInstallStateToken();
    const browserKey = randomBytes(32).toString("hex");

    await GitHubInstallState.create({
      stateHash: hash(state),
      ownerId: req.user.id,
      browserKeyHash: hash(browserKey),
      returnTo: "/repositories",
      expiresAt: new Date(Date.now() + STATE_TTL_MS),
    });

    res.cookie(COOKIE_NAME, browserKey, {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: "lax",
      maxAge: STATE_TTL_MS,
      path: "/api/v1/github",
    });

    const installUrl = new URL(
      `https://github.com/apps/${encodeURIComponent(config.githubAppSlug)}/installations/new`
    );
    installUrl.searchParams.set("state", state);

    return res.redirect(302, installUrl.toString());
  } catch (error) {
    next(error);
  }
});

// GitHub redirects here after installation or cancellation.
router.get("/setup-callback", async (req, res, next) => {
  let stateRecord = null;

  try {
    const state =
      typeof req.query.state === "string" ? req.query.state : "";
    const installationId =
      typeof req.query.installation_id === "string"
        ? req.query.installation_id
        : "";
    const setupAction =
      typeof req.query.setup_action === "string"
        ? req.query.setup_action
        : "";

    if (!/^[a-f0-9]{64}$/.test(state)) {
      clearInstallCookie(res);
      return res.redirect(
        302,
        safeFrontendUrl("/repositories?github=invalid_state")
      );
    }

    
const stateHash = hash(state);
const browserKey = req.cookies?.[COOKIE_NAME] || "";
const browserKeyHash = hash(browserKey);

// Check the state and browser binding before consuming the state.
const candidate = await GitHubInstallState.findOne({
  stateHash,
  expiresAt: { $gt: new Date() },
});

if (
  !candidate ||
  !browserKey ||
  !hashesMatch(candidate.browserKeyHash, browserKeyHash)
) {
  clearInstallCookie(res);
  return res.redirect(
    302,
    safeFrontendUrl("/repositories?github=invalid_state")
  );
}

// Consume only after the browser binding matches.
// The model must enforce single-use consumption.
stateRecord = await GitHubInstallState.consumeValidState(stateHash);

if (!stateRecord) {
  clearInstallCookie(res);
  return res.redirect(
    302,
    safeFrontendUrl("/repositories?github=invalid_state")
  );
}


    clearInstallCookie(res);

    if (setupAction === "cancel") {
      return res.redirect(
        302,
        safeFrontendUrl(`${stateRecord.returnTo}?github=cancelled`)
      );
    }
    if (
      !["install", "update"].includes(setupAction) ||
      !/^\d+$/.test(installationId)) {
      return res.redirect(
        302,
        safeFrontendUrl(`${stateRecord.returnTo}?github=invalid_installation`)
      );
    }

    // Verify the installation using this GitHub App's signed JWT.
    const verified = await getGitHubInstallation(installationId);

    if (verified.suspendedAt) {
      return res.redirect(
        302,
        safeFrontendUrl(`${stateRecord.returnTo}?github=installation_suspended`)
      );
    }

    const existing = await GitHubInstallation.findOne({
      ownerId: stateRecord.ownerId,
      installationId: verified.installationId,
    });

    if (existing) {
      await GitHubInstallation.updateOne(
        {
          ownerId: stateRecord.ownerId,
          installationId: verified.installationId,
        },
        {
          $set: {
            accountLogin: verified.accountLogin,
            accountType: verified.accountType,
            repositorySelection: verified.repositorySelection,
            suspendedAt: verified.suspendedAt,
          },
        }
      );
    } else {
      await GitHubInstallation.create({
        ownerId: stateRecord.ownerId,
        installationId: verified.installationId,
        accountLogin: verified.accountLogin,
        accountType: verified.accountType,
        repositorySelection: verified.repositorySelection,
        suspendedAt: verified.suspendedAt,
      });
    }

    return res.redirect(
      302,
      safeFrontendUrl(`${stateRecord.returnTo}?github=connected`)
    );
  } catch (error) {
    next(error);
  }
});

export default router;

router.get("/installations", requireAuth, async (req, res, next) => {
  try {
    const installations = await GitHubInstallation.find({
      ownerId: req.user.id,
    });

    return res.json({
      success: true,
      data: installations.map((installation) => ({
        installationId: installation.installationId,
        accountLogin: installation.accountLogin,
        accountType: installation.accountType,
        repositorySelection: installation.repositorySelection,
        suspended: Boolean(installation.suspendedAt),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/repositories", requireAuth, async (req, res, next) => {
  try {
    const installationId = String(req.query.installationId || "");

    if (!/^\d+$/.test(installationId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_GITHUB_INSTALLATION_ID",
          message: "A valid GitHub installation ID is required.",
        },
      });
    }

    const { token } = await getUserInstallationToken(
      req.user.id,
      installationId
    );

    const repositories = [];
    const maxPages = 10;
    let page = 1;
    let totalCount = 0;

    do {
      const result = await githubApiRequest(
        `/installation/repositories?per_page=100&page=${page}`,
        { token }
      );

      const batch = Array.isArray(result.repositories)
        ? result.repositories
        : [];

      totalCount = Number(result.total_count || 0);

      repositories.push(
        ...batch.map((repo) => ({
          providerRepoId: String(repo.id),
          fullName: repo.full_name,
          defaultBranch: repo.default_branch || "main",
          visibility: repo.private ? "private" : "public",
          installationId,
        }))
      );

      page += 1;

      if (repositories.length >= totalCount) break;
    } while (page <= maxPages);

    return res.json({
      success: true,
      data: {
        repositories,
        hasMore: repositories.length < totalCount,
      },
    });
  } catch (error) {
    next(error);
  }
});
