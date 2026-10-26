import { normalizeSeverity } from "../normalization.service.js";

const ADVISORIES = [
  {
    name: "lodash",
    vulnerableRanges: ["< 4.17.21", "4.17.15", "4.17.19", "4.17.20"],
    ruleId: "CVE-2020-8203",
    title: "Prototype Pollution in lodash",
    severity: "high",
    category: "dependencies",
    message: "lodash versions prior to 4.17.21 are vulnerable to Prototype Pollution via zipObjectDeep.",
    patchedVersion: "4.17.21",
  },
  {
    name: "jsonwebtoken",
    vulnerableRanges: ["< 9.0.0", "8.5.1", "7.4.3"],
    ruleId: "CVE-2022-23529",
    title: "Arbitrary File Write / Insecure Verification in jsonwebtoken",
    severity: "critical",
    category: "dependencies",
    message: "jsonwebtoken prior to 9.0.0 allows untrusted secret key inputs to cause arbitrary code execution or key confusion.",
    patchedVersion: "9.0.0",
  },
  {
    name: "axios",
    vulnerableRanges: ["< 0.21.1", "0.19.2", "0.20.0"],
    ruleId: "CVE-2020-28168",
    title: "Server-Side Request Forgery (SSRF) bypass in axios",
    severity: "high",
    category: "dependencies",
    message: "Axios handles absolute URLs by disregarding config.baseURL, allowing SSRF redirection.",
    patchedVersion: "0.21.1",
  },
  {
    name: "minimist",
    vulnerableRanges: ["< 1.2.6", "0.0.8", "1.2.0"],
    ruleId: "CVE-2021-44906",
    title: "Prototype Pollution in minimist",
    severity: "medium",
    category: "dependencies",
    message: "minimist before 1.2.6 is vulnerable to prototype pollution via __proto__ or constructor.prototype.",
    patchedVersion: "1.2.6",
  },
];

export async function runDependencyScanner({ files }) {
  const findings = [];
  const version = "codesense-audit-v1.0";

  const packageJsonFiles = files.filter((f) => f.path.endsWith("package.json"));

  for (const file of packageJsonFiles) {
    try {
      const parsed = JSON.parse(file.content);
      const allDeps = {
        ...(parsed.dependencies || {}),
        ...(parsed.devDependencies || {}),
      };

      for (const [depName, depVersion] of Object.entries(allDeps)) {
        const cleanVer = depVersion.replace(/[\^~>=<]/g, "").trim();

        for (const advisory of ADVISORIES) {
          if (advisory.name === depName) {
            // Check if matches vulnerable pattern
            const isMatch =
              advisory.vulnerableRanges.some((r) => r.includes(cleanVer)) ||
              (cleanVer.startsWith("4.17.") && parseInt(cleanVer.split(".")[2] || "0") < 21 && advisory.name === "lodash") ||
              (cleanVer.startsWith("8.") && advisory.name === "jsonwebtoken") ||
              (cleanVer.startsWith("0.19") && advisory.name === "axios");

            if (isMatch) {
              findings.push({
                scanner: "dependency-audit",
                ruleId: advisory.ruleId,
                title: `${advisory.title} (${depName}@${depVersion})`,
                message: `${advisory.message} Upgrade to ${advisory.patchedVersion} or higher.`,
                severity: normalizeSeverity(advisory.severity),
                category: advisory.category,
                filePath: file.path,
                startLine: 1,
                endLine: 1,
                codeAnchor: `"${depName}": "${depVersion}"`,
                codeSnippet: `"${depName}": "${depVersion}" // Patched: ${advisory.patchedVersion}`,
                source: "dependency-tool",
                rawMetadata: {
                  scannerVersion: version,
                  vulnerablePackage: depName,
                  installedVersion: depVersion,
                  fixedVersion: advisory.patchedVersion,
                },
              });
            }
          }
        }
      }
    } catch {
      // Invalid JSON in package.json is ignored safely
    }
  }

  return {
    scanner: "dependency-audit",
    version,
    rulesetVersion: "1.0.0",
    findings,
  };
}
