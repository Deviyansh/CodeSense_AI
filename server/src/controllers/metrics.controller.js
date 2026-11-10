import { Repository } from "../models/repository.model.js";
import { Scan } from "../models/scan.model.js";
import { Finding } from "../models/finding.model.js";

export async function getMetricsSummary(req, res, next) {
  try {
    const userId = req.user.id;

    const [repositories, scans] = await Promise.all([
      Repository.find({ ownerId: userId }),
      Scan.find({ requestedBy: userId }).sort({ createdAt: -1 }),
    ]);

    const totalScans = scans.length;
    const totalRepositories = repositories.length;

    // Severity, category, and triage distributions across all user's latest scans
    const severityDistribution = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const categoryDistribution = { security: 0, correctness: 0, quality: 0, secrets: 0, dependencies: 0 };
    const triageDistribution = { open: 0, accepted_risk: 0, false_positive: 0, fixed: 0, suppressed: 0 };

    let totalFindingsCount = 0;

    // Get latest scan for each repo to compute current posture
    const latestScanByRepo = new Map();
    for (const scan of scans) {
      const repoKey = String(scan.repositoryId);
      if (!latestScanByRepo.has(repoKey) && scan.status === "completed") {
        latestScanByRepo.set(repoKey, scan);
      }
    }

    const latestScanIds = Array.from(latestScanByRepo.values()).map((s) => s._id);

    if (latestScanIds.length > 0) {
      const currentFindings = await Finding.find({ scanId: { $in: latestScanIds } });
      totalFindingsCount = currentFindings.length;

      for (const f of currentFindings) {
        if (severityDistribution[f.severity] !== undefined) {
          severityDistribution[f.severity]++;
        }
        if (categoryDistribution[f.category] !== undefined) {
          categoryDistribution[f.category]++;
        }
        const stateKey = f.state === "accepted" || f.state === "risk-accepted" ? "accepted_risk" : f.state === "false-positive" ? "false_positive" : f.state || "open";
        if (triageDistribution[stateKey] !== undefined) {
          triageDistribution[stateKey]++;
        }
      }
    }

    // Scanner health across all scans
    const scannerStats = {
      eslint: { executed: 0, passed: 0 },
      semgrep: { executed: 0, passed: 0 },
      gitleaks: { executed: 0, passed: 0 },
      "osv-dependency-audit": { executed: 0, passed: 0 },
    };

    for (const scan of scans) {
      const scanners = scan.scanners || [];
      for (const s of scanners) {
        const key = s.scanner.includes("semgrep")
          ? "semgrep"
          : s.scanner.includes("eslint")
          ? "eslint"
          : s.scanner.includes("gitleaks")
          ? "gitleaks"
          : "osv-dependency-audit";
        if (scannerStats[key]) {
          scannerStats[key].executed++;
          if (s.status === "completed") scannerStats[key].passed++;
        }
      }
    }

    // Posture trend (last 6 scans)
    const postureTrend = scans
      .filter((s) => s.status === "completed")
      .slice(0, 6)
      .reverse()
      .map((s) => ({
        scanId: String(s._id),
        date: s.createdAt,
        total: s.summary?.total || 0,
        critical: s.summary?.critical || 0,
        high: s.summary?.high || 0,
        medium: s.summary?.medium || 0,
      }));

    return res.status(200).json({
      success: true,
      data: {
        totalScans,
        totalRepositories,
        totalFindings: totalFindingsCount,
        severityDistribution,
        categoryDistribution,
        triageDistribution,
        scannerHealth: {
          eslint: scannerStats.eslint.executed > 0 ? Math.round((scannerStats.eslint.passed / scannerStats.eslint.executed) * 100) : 100,
          semgrep: scannerStats.semgrep.executed > 0 ? Math.round((scannerStats.semgrep.passed / scannerStats.semgrep.executed) * 100) : 100,
          gitleaks: scannerStats.gitleaks.executed > 0 ? Math.round((scannerStats.gitleaks.passed / scannerStats.gitleaks.executed) * 100) : 100,
          dependencies: scannerStats["osv-dependency-audit"].executed > 0 ? Math.round((scannerStats["osv-dependency-audit"].passed / scannerStats["osv-dependency-audit"].executed) * 100) : 100,
        },
        postureTrend,
      },
      meta: { requestId: req.id },
    });
  } catch (err) {
    return next(err);
  }
}

