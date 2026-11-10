import { runESLintScanner } from "./adapters/eslint.adapter.js";
import { runSecurityScanner } from "./adapters/security.adapter.js";
import { runSecretScanner } from "./adapters/secrets.adapter.js";
import { runDependencyScanner } from "./adapters/dependency.adapter.js";
import { deduplicateFindings, computeSummary } from "./normalization.service.js";
import { logger } from "../../utils/logger.js";
import { config } from "../../config/index.js";

const IGNORED_PATH_SEGMENTS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
];

export async function runCodeAnalysis({
  files,
  repoFullName,
  commitSha,
  onProgress,
  checkCancelled,
}) {
  const startTime = Date.now();
  const maxFiles = config.maxRepositoryFiles || 500;
  const maxSizeBytes = (config.maxFileSizeKb || 500) * 1024;

  // 1. Stage: intake & filtering
  if (onProgress) await onProgress({ stage: "intake", progress: 15 });
  if (checkCancelled && (await checkCancelled())) {
    throw Object.assign(new Error("Scan cancelled by user"), { code: "SCAN_CANCELLED" });
  }

  // Filter out ignored paths, huge files, directory traversal attempts
  const safeFiles = files
    .filter((f) => {
      const norm = (f.path || "").replace(/\\/g, "/");
      // Check path traversal attempts
      if (norm.includes("..") || norm.startsWith("/")) return false;
      // Check ignored segments
      if (IGNORED_PATH_SEGMENTS.some((seg) => norm.split("/").includes(seg))) return false;
      // Check file size
      if (f.content && f.content.length > maxSizeBytes) return false;
      return true;
    })
    .slice(0, maxFiles);

  // 2. Stage: static analysis (ESLint & Semgrep Security)
  if (onProgress) await onProgress({ stage: "static_analysis", progress: 40 });
  if (checkCancelled && (await checkCancelled())) {
    throw Object.assign(new Error("Scan cancelled by user"), { code: "SCAN_CANCELLED" });
  }

  const [eslintResult, securityResult] = await Promise.all([
    runESLintScanner({ files: safeFiles }),
    runSecurityScanner({ files: safeFiles }),
  ]);

  // 3. Stage: secret scan (Gitleaks) & dependency intelligence (OSV)
  if (onProgress) await onProgress({ stage: "secret_scan", progress: 65 });
  if (checkCancelled && (await checkCancelled())) {
    throw Object.assign(new Error("Scan cancelled by user"), { code: "SCAN_CANCELLED" });
  }

  const [secretsResult, dependencyResult] = await Promise.all([
    runSecretScanner({ files: safeFiles }),
    runDependencyScanner({ files: safeFiles }),
  ]);

  // 4. Stage: normalization & deduplication
  if (onProgress) await onProgress({ stage: "normalization", progress: 85 });
  if (checkCancelled && (await checkCancelled())) {
    throw Object.assign(new Error("Scan cancelled by user"), { code: "SCAN_CANCELLED" });
  }

  const allRawFindings = [
    ...eslintResult.findings,
    ...securityResult.findings,
    ...secretsResult.findings,
    ...dependencyResult.findings,
  ];

  // Enrich with commitSha
  const enrichedFindings = allRawFindings.map((f) => ({
    ...f,
    commitSha: commitSha || null,
  }));

  const dedupedFindings = deduplicateFindings(enrichedFindings);
  const summary = computeSummary(dedupedFindings);

  const scannerExecutionResults = [
    {
      scanner: eslintResult.scanner,
      version: eslintResult.version,
      rulesetVersion: eslintResult.rulesetVersion,
      status: eslintResult.status || "completed",
      findingsCount: eslintResult.findings.length,
      durationMs: eslintResult.durationMs || 0,
      error: eslintResult.error || null,
    },
    {
      scanner: securityResult.scanner,
      version: securityResult.version,
      rulesetVersion: securityResult.rulesetVersion,
      status: securityResult.status || "completed",
      findingsCount: securityResult.findings.length,
      durationMs: securityResult.durationMs || 0,
      error: securityResult.error || null,
    },
    {
      scanner: secretsResult.scanner,
      version: secretsResult.version,
      rulesetVersion: secretsResult.rulesetVersion,
      status: secretsResult.status || "completed",
      findingsCount: secretsResult.findings.length,
      durationMs: secretsResult.durationMs || 0,
      error: secretsResult.error || null,
    },
    {
      scanner: dependencyResult.scanner,
      version: dependencyResult.version,
      rulesetVersion: dependencyResult.rulesetVersion,
      status: dependencyResult.status || "completed",
      findingsCount: dependencyResult.findings.length,
      durationMs: dependencyResult.durationMs || 0,
      error: dependencyResult.error || null,
    },
  ];

  const scannerVersions = scannerExecutionResults.map((s) => ({
    scanner: s.scanner,
    version: s.version,
    rulesetVersion: s.rulesetVersion,
  }));

  logger.info("scan.analysis_completed", {
    repoFullName,
    commitSha,
    durationMs: Date.now() - startTime,
    scannerCount: scannerExecutionResults.length,
    findingCount: dedupedFindings.length,
    scanners: scannerExecutionResults.map((s) => ({ scanner: s.scanner, status: s.status })),
  });

  return {
    findings: dedupedFindings,
    summary,
    scannerVersions,
    scanners: scannerExecutionResults,
  };
}
