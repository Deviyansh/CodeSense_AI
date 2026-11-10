import { Repository } from "../models/repository.model.js";
import { Scan } from "../models/scan.model.js";
import { Finding } from "../models/finding.model.js";
import { AuditEvent } from "../models/auditEvent.model.js";
import { scanQueue } from "../queues/scan.queue.js";
import {
  resolveCommitSha,
  verifyRepositoryAccess,
} from "../services/github/github.service.js";
import { createScanSchema } from "../validators/schemas.js";
import { redactSecrets } from "../utils/secret-redactor.js";

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
      scanners: [],
    });

    scanQueue.enqueue({
      scanId: String(scan._id),
      repositoryId: String(repository._id),
      requestedBy: req.user.id,
    });

    await AuditEvent.create({
      actor: String(req.user.id),
      action: "scan.queued",
      resource: `scan:${scan._id}`,
      requestId: req.id,
      safeMetadata: { branch, commitSha, repo: repository.fullName },
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
 * Cancel an active or queued scan.
 */
export async function cancelScan(req, res, next) {
  try {
    const scan = await Scan.findById(req.params.id);

    if (!scan || !isScanOwner(scan, req.user.id)) {
      return notFound(res, req, "SCAN_NOT_FOUND", "Scan not found");
    }

    if (["completed", "failed", "cancelled"].includes(scan.status)) {
      return res.status(409).json({
        success: false,
        error: {
          code: "SCAN_ALREADY_TERMINAL",
          message: `Cannot cancel scan that is already in '${scan.status}' status`,
        },
        meta: { requestId: req.id },
      });
    }

    await scanQueue.cancelScan(scan._id);

    const updated = await Scan.findById(scan._id);

    await AuditEvent.create({
      actor: String(req.user.id),
      action: "scan.cancelled",
      resource: `scan:${scan._id}`,
      requestId: req.id,
    });

    return res.status(200).json({
      success: true,
      data: updated,
      meta: { requestId: req.id },
    });
  } catch (err) {
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
 * List the authenticated user's historical scans.
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
          ...(typeof scan.toObject === "function" ? scan.toObject() : scan),
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
        ...(typeof scan.toObject === "function" ? scan.toObject() : scan),
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
 * Export a scan report as JSON or sanitized Markdown.
 */
export async function exportScanReport(req, res, next) {
  try {
    const scan = await Scan.findById(req.params.id);

    if (!scan || !isScanOwner(scan, req.user.id)) {
      return notFound(res, req, "SCAN_NOT_FOUND", "Scan not found");
    }

    const repository = await getRepositoryMetadata(scan.repositoryId);
    const rawFindings = await Finding.find({ scanId: scan._id }).sort({
      severity: 1,
    });

    // Redact any sensitive credentials from exported findings
    const findings = rawFindings.map((f) => ({
      ...f,
      codeSnippet: redactSecrets(f.codeSnippet || ""),
      sanitizedSnippet: redactSecrets(f.sanitizedSnippet || f.codeSnippet || ""),
      codeAnchor: redactSecrets(f.codeAnchor || ""),
      message: redactSecrets(f.message || ""),
    }));

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

      if (scan.scannerVersions && scan.scannerVersions.length > 0) {
        md += `## Scanner Tool Provenance\n`;
        for (const sv of scan.scannerVersions) {
          md += `- **${sv.scanner}**: version \`${sv.version}\` (Ruleset: \`${sv.rulesetVersion || "standard"}\`)\n`;
        }
        md += `\n`;
      }

      md += `## Normalized Findings\n\n`;

      for (const finding of findings) {
        md += `### [${String(finding.severity || "unknown").toUpperCase()}] ${finding.title}\n`;
        md += `- **File**: \`${finding.filePath}:${finding.startLine}\`\n`;
        md += `- **Scanner / Rule**: \`${finding.scanner}\` / \`${finding.ruleId}\`\n`;
        md += `- **Category**: ${finding.category}\n`;
        if (finding.cwe && finding.cwe.length > 0) {
          md += `- **CWE**: ${finding.cwe.join(", ")}\n`;
        }
        if (finding.owasp && finding.owasp.length > 0) {
          md += `- **OWASP**: ${finding.owasp.join(", ")}\n`;
        }
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
 * Compare two scans with strict scanner coverage verification.
 * Per blueprint: If a scanner failed or was skipped in the target scan,
 * do not mark its prior findings resolved; classify as uncomparable.
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

    // Inspect scanner statuses in target scan
    const targetScanners = targetScan.scanners || [];
    const targetScannerStatusMap = new Map();
    for (const s of targetScanners) {
      targetScannerStatusMap.set(s.scanner, s.status);
    }

    const coverageNotes = [];
    for (const [scanner, status] of targetScannerStatusMap.entries()) {
      if (status !== "completed") {
        coverageNotes.push(
          `Scanner '${scanner}' had status '${status}' in target scan; prior findings cannot be safely declared resolved.`
        );
      }
    }

    const baseMap = new Map(
      baseFindings.map((finding) => [finding.fingerprint, finding])
    );
    const targetMap = new Map(
      targetFindings.map((finding) => [finding.fingerprint, finding])
    );

    const newFindings = [];
    const persistentFindings = [];
    const resolvedFindings = [];
    const uncomparableFindings = [];

    for (const [fingerprint, finding] of targetMap.entries()) {
      if (baseMap.has(fingerprint)) {
        persistentFindings.push(finding);
      } else {
        newFindings.push(finding);
      }
    }

    for (const [fingerprint, finding] of baseMap.entries()) {
      if (!targetMap.has(fingerprint)) {
        // Check if scanner was complete in target scan
        const targetStatus = targetScannerStatusMap.get(finding.scanner);
        const scannerWasSuccessful =
          targetStatus === "completed" || targetScannerStatusMap.size === 0;

        if (scannerWasSuccessful) {
          resolvedFindings.push(finding);
        } else {
          uncomparableFindings.push(finding);
        }
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
          uncomparableCount: uncomparableFindings.length,
        },
        newFindings,
        resolvedFindings,
        persistentFindings,
        uncomparableFindings,
        coverageNotes,
      },
      meta: { requestId: req.id },
    });
  } catch (err) {
    return next(err);
  }
}
