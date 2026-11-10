import { Scan } from "../models/scan.model.js";
import { Repository } from "../models/repository.model.js";
import { Finding } from "../models/finding.model.js";
import {
  fetchRepositoryFiles,
  verifyRepositoryAccess,
} from "../services/github/github.service.js";
import { runCodeAnalysis } from "../services/analysis/analysis.service.js";
import { logger } from "../utils/logger.js";

/**
 * Worker processor for executing a scan job asynchronously.
 * Historical scans and findings are retained if access is revoked.
 */
export async function processScanJob({ scanId, repositoryId, requestedBy }) {
  const scan = await Scan.findById(scanId);

  if (!scan) {
    logger.warn("worker.scan_not_found", { scanId });
    return;
  }

  // Idempotency: skip scans that are already terminal.
  if (["completed", "cancelled", "failed"].includes(scan.status)) {
    return;
  }

  const checkCancelled = async () => {
    const current = await Scan.findById(scanId);
    return Boolean(current?.cancellationRequested || current?.status === "cancelled");
  };

  try {
    if (await checkCancelled()) {
      await markCancelled(scanId);
      return;
    }

    const repository = await Repository.findOne({
      _id: repositoryId,
      ownerId: requestedBy,
    });

    if (!repository) {
      await Scan.findByIdAndUpdate(scanId, {
        status: "failed",
        stage: "failed",
        progress: 100,
        errorCode: "REPOSITORY_NOT_CONNECTED",
        errorMessage:
          "The repository connection no longer exists. Historical scan data is preserved.",
        completedAt: new Date(),
      });
      return;
    }

    // Verify GitHub access immediately before fetching source files.
    const access = await verifyRepositoryAccess(repository);

    if (!access.accessible) {
      await Scan.findByIdAndUpdate(scanId, {
        status: "failed",
        stage: "failed",
        progress: 100,
        errorCode: "GITHUB_ACCESS_REVOKED",
        errorMessage:
          "GitHub access to this repository is unavailable. Reconnect the repository before starting another scan.",
        completedAt: new Date(),
      });

      logger.warn("worker.repository_access_unavailable", {
        scanId,
        repositoryId,
        reason: access.reason,
      });
      return;
    }

    if (await checkCancelled()) {
      await markCancelled(scanId);
      return;
    }

    // Mark the scan as running only after access verification.
    await Scan.findByIdAndUpdate(scanId, {
      status: "running",
      stage: "intake",
      progress: 10,
      startedAt: new Date(),
    });

    // Fetch the pinned source snapshot.
    const files = await fetchRepositoryFiles({
      repository,
      commitSha: scan.commitSha,
    });

    if (await checkCancelled()) {
      await markCancelled(scanId);
      return;
    }

    // Run the analysis engine with cancellation checking.
    const analysisResult = await runCodeAnalysis({
      files,
      repoFullName: repository.fullName,
      commitSha: scan.commitSha,
      checkCancelled,
      onProgress: async ({ stage, progress }) => {
        if (!(await checkCancelled())) {
          await Scan.findByIdAndUpdate(scanId, { stage, progress });
        }
      },
    });

    if (await checkCancelled()) {
      await markCancelled(scanId);
      return;
    }

    // Persist findings for this scan.
    await Scan.findByIdAndUpdate(scanId, {
      stage: "persistence",
      progress: 90,
    });

    await Finding.deleteMany({ scanId });

    const findingsToInsert = analysisResult.findings.map((finding) => ({
      ...finding,
      scanId,
      firstSeenScanId: scanId,
      lastSeenScanId: scanId,
    }));

    if (findingsToInsert.length > 0) {
      await Finding.insertMany(findingsToInsert);
    }

    await Scan.findByIdAndUpdate(scanId, {
      status: "completed",
      stage: "completed",
      progress: 100,
      summary: analysisResult.summary,
      scannerVersions: analysisResult.scannerVersions,
      scanners: analysisResult.scanners,
      completedAt: new Date(),
    });

    logger.info("worker.scan_job_succeeded", {
      scanId,
      repositoryId,
      totalFindings: analysisResult.findings.length,
    });
  } catch (err) {
    if (err.code === "SCAN_CANCELLED") {
      await markCancelled(scanId);
      return;
    }

    logger.error("worker.scan_job_failed", {
      scanId,
      repositoryId,
      error: err.message,
    });

    await Scan.findByIdAndUpdate(scanId, {
      status: "failed",
      stage: "failed",
      progress: 100,
      errorCode: err.code || "SCANNER_EXECUTION_FAILED",
      errorMessage: err.message || "Static analysis failed to execute",
      completedAt: new Date(),
    });
  }
}

async function markCancelled(scanId) {
  await Scan.findByIdAndUpdate(scanId, {
    status: "cancelled",
    stage: "cancelled",
    cancellationRequested: true,
    cancelledAt: new Date(),
    progress: 100,
  });
  logger.info("worker.scan_job_cancelled", { scanId });
}

/**
 * Reconcile stuck running scans on process boot.
 */
export async function reconcileStuckScans() {
  try {
    const stuckScans = await Scan.find({
      status: { $in: ["running", "queued"] },
    });

    if (stuckScans && stuckScans.length > 0) {
      logger.info("worker.reconciling_stuck_scans", { count: stuckScans.length });
      for (const scan of stuckScans) {
        await Scan.findByIdAndUpdate(scan._id, {
          status: "failed",
          stage: "failed",
          progress: 100,
          errorCode: "WORKER_INTERRUPTED_RECOVERY",
          errorMessage:
            "Scan was interrupted by server process restart. Historical data preserved. Please restart scan.",
          completedAt: new Date(),
        });
      }
    }
  } catch (err) {
    logger.warn("worker.reconciliation_failed", { error: err.message });
  }
}
