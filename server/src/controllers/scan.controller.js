
import { Repository } from "../models/repository.model.js";
import { Scan } from "../models/scan.model.js";
import { Finding } from "../models/finding.model.js";
import { AIReview } from "../models/aiReview.model.js";
import { scanQueue } from "../queues/scan.queue.js";
import {
  resolveCommitSha,
  verifyRepositoryAccess,
} from "../services/github/github.service.js";
import { createScanSchema } from "../validators/schemas.js";

const notFound = (res, req, code, message) =>
  res.status(404).json({
    success: false,
    error: { code, message },
    meta: { requestId: req.id },
  });

const isScanOwner = (scan, userId) =>
  String(scan.requestedBy) === String(userId);

async function getRepositoryMetadata(repositoryId) {
  const repository = await Repository.findById(repositoryId);

  return {
    fullName: repository?.fullName || "Disconnected repository",
    defaultBranch: repository?.defaultBranch || null,
    connected: Boolean(repository),
  };
}

/**
 * Queue a scan for a currently connected repository.
 */

export async function queueScan(req, res, next) {
  try {
    const repository = await Repository.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
    });

    if (!repository) {
      return notFound(
        res,
        req,
        "REPOSITORY_NOT_FOUND",
        "Repository not found or access denied"
      );
    }

    const input = createScanSchema.parse(req.body);
    const branch = input.branch || repository.defaultBranch || "main";

    // Always verify access, even if the client supplied a commit SHA.
    let access;

    try {
      access = await verifyRepositoryAccess(repository);
    } catch (error) {
      // An API or network failure does not prove access was revoked.
      return next(error);
    }

    if (!access.accessible) {
      return res.status(409).json({
        success: false,
        error: {
          code: "GITHUB_ACCESS_REVOKED",
          message:
            "This repository is no longer accessible through its GitHub connection. Reconnect it before starting a new scan.",
          reason: access.reason,
        },
        meta: { requestId: req.id },
      });
    }

    // Resolve the commit only after access has been verified.
    const commitSha =
      input.commitSha ||
      (await resolveCommitSha({ repository, branch }));

    const scan = await Scan.create({
      repositoryId: repository._id,
      requestedBy: req.user.id,
      branch,
      commitSha,
      status: "queued",
      stage: "queued",
      progress: 0,
      scannerVersions: [],
    });

    scanQueue.enqueue({
      scanId: String(scan._id),
      repositoryId: String(repository._id),
      requestedBy: req.user.id,
    });

    return res.status(202).json({
      success: true,
      data: {
        scanId: String(scan._id),
        status: "queued",
        branch,
        commitSha,
      },
      meta: { requestId: req.id },
    });
  } catch (err) {
    if (err.name === "ZodError") {
      err.statusCode = 400;
      err.code = "VALIDATION_ERROR";
      err.message = err.errors.map((e) => e.message).join(", ");
    }

    return next(err);
  }
}

/**
 * List scans for a currently connected repository.
 */
export async function getRepositoryScans(req, res, next) {
  try {
    const repository = await Repository.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
    });

    if (!repository) {
      return notFound(
        res,
        req,
        "REPOSITORY_NOT_FOUND",
        "Repository not found"
      );
    }

    const scans = await Scan.find({
      repositoryId: repository._id,
      requestedBy: req.user.id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: scans,
      meta: { requestId: req.id },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * List the authenticated user's historical scans, including scans
 * whose repositories have since been disconnected.
 *
 * Register GET / before GET /:id in scan.routes.js.
 */
export async function listMyScans(req, res, next) {
  try {
    const scans = await Scan.find({
      requestedBy: req.user.id,
    }).sort({ createdAt: -1 });

    const data = await Promise.all(
      scans.map(async (scan) => {
        const repository = await getRepositoryMetadata(scan.repositoryId);

        return {
          ...(typeof scan.toObject === "function"
            ? scan.toObject()
            : scan),
          repoFullName: repository.fullName,
          repositoryConnected: repository.connected,
          repository: {
            fullName: repository.fullName,
            defaultBranch: repository.defaultBranch,
            connected: repository.connected,
          },
        };
      })
    );

    return res.status(200).json({
      success: true,
      data,
      meta: { requestId: req.id },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Retrieve a scan owned by the authenticated user.
 * A disconnected repository does not invalidate historical scan access.
 */
export async function getScanById(req, res, next) {
  try {
    const scan = await Scan.findById(req.params.id);

    if (!scan || !isScanOwner(scan, req.user.id)) {
      return notFound(res, req, "SCAN_NOT_FOUND", "Scan not found");
    }

    const repository = await getRepositoryMetadata(scan.repositoryId);

    return res.status(200).json({
      success: true,
      data: {
        ...(typeof scan.toObject === "function"
          ? scan.toObject()
          : scan),
        repository: {
          fullName: repository.fullName,
          defaultBranch: repository.defaultBranch,
          connected: repository.connected,
        },
      },
      meta: { requestId: req.id },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Export a scan report, even if its repository is disconnected.
 */
export async function exportScanReport(req, res, next) {
  try {
    const scan = await Scan.findById(req.params.id);

    if (!scan || !isScanOwner(scan, req.user.id)) {
      return notFound(res, req, "SCAN_NOT_FOUND", "Scan not found");
    }

    const repository = await getRepositoryMetadata(scan.repositoryId);
    const findings = await Finding.find({ scanId: scan._id }).sort({
      severity: 1,
    });

    const format = req.query.format || "json";

    if (format === "markdown") {
      let md = `# CodeSense AI Security & Quality Audit Report\n\n`;
      md += `**Repository**: ${repository.fullName}\n`;
      md += `**Repository Connected**: ${repository.connected ? "Yes" : "No"}\n`;
      md += `**Branch**: ${scan.branch}\n`;
      md += `**Commit SHA**: \`${scan.commitSha}\`\n`;
      md += `**Scan Date**: ${scan.createdAt}\n`;
      md += `**Scan Status**: ${String(scan.status || "unknown").toUpperCase()}\n\n`;

      md += `## Executive Summary\n`;
      md += `- **Total Issues Detected**: ${scan.summary?.total || 0}\n`;
      md += `- **Critical**: ${scan.summary?.critical || 0}\n`;
      md += `- **High**: ${scan.summary?.high || 0}\n`;
      md += `- **Medium**: ${scan.summary?.medium || 0}\n`;
      md += `- **Low**: ${scan.summary?.low || 0}\n\n`;
      md += `## Normalized Findings\n\n`;

      for (const finding of findings) {
        md += `### [${String(finding.severity || "unknown").toUpperCase()}] ${finding.title}\n`;
        md += `- **File**: \`${finding.filePath}:${finding.startLine}\`\n`;
        md += `- **Scanner / Rule**: \`${finding.scanner}\` / \`${finding.ruleId}\`\n`;
        md += `- **Category**: ${finding.category}\n`;
        md += `- **Description**: ${finding.message}\n\n`;

        if (finding.codeSnippet) {
          md += `\`\`\`javascript\n${finding.codeSnippet}\n\`\`\`\n\n`;
        }
      }

      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="codesense-report-${scan._id}.md"`
      );

      return res.send(md);
    }

    return res.status(200).json({
      success: true,
      data: {
        scan,
        repository: {
          fullName: repository.fullName,
          defaultBranch: repository.defaultBranch,
          connected: repository.connected,
        },
        findings,
      },
      meta: { requestId: req.id },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Compare two scans owned by the authenticated user.
 * Both scans must still belong to the same repository ID, but that
 * repository does not have to remain connected.
 */
export async function compareScans(req, res, next) {
  try {
    const { id: baseScanId, compareScanId } = req.params;

    const [baseScan, targetScan] = await Promise.all([
      Scan.findById(baseScanId),
      Scan.findById(compareScanId),
    ]);

    if (
      !baseScan ||
      !targetScan ||
      !isScanOwner(baseScan, req.user.id) ||
      !isScanOwner(targetScan, req.user.id)
    ) {
      return notFound(
        res,
        req,
        "SCAN_NOT_FOUND",
        "One or both scans not found"
      );
    }

    if (String(baseScan.repositoryId) !== String(targetScan.repositoryId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "SCAN_REPOSITORY_MISMATCH",
          message:
            "Scans can only be compared when they belong to the same repository",
        },
        meta: { requestId: req.id },
      });
    }

    const [baseFindings, targetFindings] = await Promise.all([
      Finding.find({ scanId: baseScanId }),
      Finding.find({ scanId: compareScanId }),
    ]);

    const baseMap = new Map(
      baseFindings.map((finding) => [finding.fingerprint, finding])
    );
    const targetMap = new Map(
      targetFindings.map((finding) => [finding.fingerprint, finding])
    );

    const newFindings = [];
    const persistentFindings = [];
    const resolvedFindings = [];

    for (const [fingerprint, finding] of targetMap.entries()) {
      if (baseMap.has(fingerprint)) {
        persistentFindings.push(finding);
      } else {
        newFindings.push(finding);
      }
    }

    for (const [fingerprint, finding] of baseMap.entries()) {
      if (!targetMap.has(fingerprint)) {
        resolvedFindings.push(finding);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        baseScan: {
          id: String(baseScan._id),
          commitSha: baseScan.commitSha,
          createdAt: baseScan.createdAt,
        },
        targetScan: {
          id: String(targetScan._id),
          commitSha: targetScan.commitSha,
          createdAt: targetScan.createdAt,
        },
        diffSummary: {
          newCount: newFindings.length,
          resolvedCount: resolvedFindings.length,
          persistentCount: persistentFindings.length,
        },
        newFindings,
        resolvedFindings,
        persistentFindings,
      },
      meta: { requestId: req.id },
    });
  } catch (err) {
    return next(err);
  }
}
