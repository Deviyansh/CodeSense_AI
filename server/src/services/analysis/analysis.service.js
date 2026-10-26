import { runESLintScanner } from "./adapters/eslint.adapter.js";
import { runSecurityScanner } from "./adapters/security.adapter.js";
import { runSecretScanner } from "./adapters/secrets.adapter.js";
import { runDependencyScanner } from "./adapters/dependency.adapter.js";
import { deduplicateFindings, computeSummary } from "./normalization.service.js";
import { logger } from "../../utils/logger.js";

// Max bounds per Chapter 15 & 20
const MAX_FILE_COUNT = 500;
const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500 KB per file
const IGNORED_PATH_SEGMENTS = ["node_modules", ".git", "dist", "build", "coverage", ".next", ".turbo"];

export async function runCodeAnalysis({ files, repoFullName, commitSha, onProgress }) {
  const startTime = Date.now();

  // 1. Stage: intake & filtering
  if (onProgress) onProgress({ stage: "intake", progress: 15 });

  // Filter out ignored paths, huge files, binaries
  const safeFiles = files
    .filter((f) => {
      const norm = f.path.replace(/\\/g, "/");
      // Check path traversal attempts
      if (norm.includes("..") || norm.startsWith("/")) return false;
      // Check ignored segments
      if (IGNORED_PATH_SEGMENTS.some((seg) => norm.split("/").includes(seg))) return false;
      // Check file size
      if (f.content && f.content.length > MAX_FILE_SIZE_BYTES) return false;
      return true;
    })
    .slice(0, MAX_FILE_COUNT);

  // 2. Stage: static analysis (ESLint & Semgrep Security)
  if (onProgress) onProgress({ stage: "static_analysis", progress: 40 });
  const [eslintResult, securityResult] = await Promise.all([
    runESLintScanner({ files: safeFiles }),
    runSecurityScanner({ files: safeFiles }),
  ]);

  // 3. Stage: secret scan (Gitleaks) & dependencies
  if (onProgress) onProgress({ stage: "secret_scan", progress: 65 });
  const [secretsResult, dependencyResult] = await Promise.all([
    runSecretScanner({ files: safeFiles }),
    runDependencyScanner({ files: safeFiles }),
  ]);

  // 4. Stage: normalization & deduplication
  if (onProgress) onProgress({ stage: "normalization", progress: 85 });
  const allRawFindings = [
    ...eslintResult.findings,
    ...securityResult.findings,
    ...secretsResult.findings,
    ...dependencyResult.findings,
  ];

  const dedupedFindings = deduplicateFindings(allRawFindings);
  const summary = computeSummary(dedupedFindings);

  const scannerVersions = [
    { scanner: eslintResult.scanner, version: eslintResult.version, rulesetVersion: eslintResult.rulesetVersion },
    { scanner: securityResult.scanner, version: securityResult.version, rulesetVersion: securityResult.rulesetVersion },
    { scanner: secretsResult.scanner, version: secretsResult.version, rulesetVersion: secretsResult.rulesetVersion },
    { scanner: dependencyResult.scanner, version: dependencyResult.version, rulesetVersion: dependencyResult.rulesetVersion },
  ];

  logger.info("scan.analysis_completed", {
    repoFullName,
    commitSha,
    durationMs: Date.now() - startTime,
    scannerCount: scannerVersions.length,
    findingCount: dedupedFindings.length,
  });

  return {
    findings: dedupedFindings,
    summary,
    scannerVersions,
  };
}
