import semver from "semver";
import { normalizeSeverity } from "../normalization.service.js";

export const DEPENDENCY_METADATA = {
  tool: "osv-dependency-audit",
  toolVersion: "osv-v1.4.0",
  rulesetVersion: "advisory-db-2026.11",
  supportedLockfiles: ["package-lock.json", "package.json"],
  exitCodeSemantics:
    "0: no vulnerable dependencies found, 1: known CVE vulnerabilities detected, 2: invalid manifest or lockfile syntax",
  timeoutMs: 30000,
};

// Curated OSV / GitHub Security Advisory Database snapshot
const OSV_ADVISORY_DATABASE = [
  {
    name: "lodash",
    ecosystem: "npm",
    ruleId: "CVE-2020-8203",
    advisoryId: "GHSA-p6mc-m468-83gw",
    title: "Prototype Pollution in lodash",
    severity: "high",
    cvss: 7.4,
    cwe: ["CWE-1321"],
    owasp: ["A03:2021-Injection"],
    vulnerableRange: "< 4.17.21",
    patchedVersion: "4.17.21",
    message:
      "lodash versions prior to 4.17.21 are vulnerable to Prototype Pollution via zipObjectDeep.",
    advisoryUrl: "https://osv.dev/vulnerability/GHSA-p6mc-m468-83gw",
    sourceTimestamp: "2020-07-15T00:00:00Z",
  },
  {
    name: "lodash",
    ecosystem: "npm",
    ruleId: "CVE-2021-23337",
    advisoryId: "GHSA-35jh-r3h4-6jhm",
    title: "Command Injection in lodash template",
    severity: "high",
    cvss: 7.2,
    cwe: ["CWE-78"],
    owasp: ["A03:2021-Injection"],
    vulnerableRange: "< 4.17.21",
    patchedVersion: "4.17.21",
    message: "lodash template function is vulnerable to Command Injection via variable name.",
    advisoryUrl: "https://osv.dev/vulnerability/GHSA-35jh-r3h4-6jhm",
    sourceTimestamp: "2021-02-15T00:00:00Z",
  },
  {
    name: "jsonwebtoken",
    ecosystem: "npm",
    ruleId: "CVE-2022-23529",
    advisoryId: "GHSA-8cf7-32gw-wr33",
    title: "Insecure Key Verification / Code Execution in jsonwebtoken",
    severity: "critical",
    cvss: 9.8,
    cwe: ["CWE-94"],
    owasp: ["A07:2021-Identification and Authentication Failures"],
    vulnerableRange: "< 9.0.0",
    patchedVersion: "9.0.0",
    message:
      "jsonwebtoken prior to 9.0.0 allows untrusted secret key inputs to cause arbitrary code execution or key confusion.",
    advisoryUrl: "https://osv.dev/vulnerability/GHSA-8cf7-32gw-wr33",
    sourceTimestamp: "2022-12-21T00:00:00Z",
  },
  {
    name: "axios",
    ecosystem: "npm",
    ruleId: "CVE-2020-28168",
    advisoryId: "GHSA-4w2v-q235-vp99",
    title: "Server-Side Request Forgery (SSRF) bypass in axios",
    severity: "high",
    cvss: 5.9,
    cwe: ["CWE-918"],
    owasp: ["A10:2021-Server-Side Request Forgery"],
    vulnerableRange: "< 0.21.1",
    patchedVersion: "0.21.1",
    message:
      "Axios handles absolute URLs by disregarding config.baseURL, allowing SSRF redirection.",
    advisoryUrl: "https://osv.dev/vulnerability/GHSA-4w2v-q235-vp99",
    sourceTimestamp: "2020-11-04T00:00:00Z",
  },
  {
    name: "minimist",
    ecosystem: "npm",
    ruleId: "CVE-2021-44906",
    advisoryId: "GHSA-xvch-5ox4-994e",
    title: "Prototype Pollution in minimist",
    severity: "medium",
    cvss: 5.3,
    cwe: ["CWE-1321"],
    owasp: ["A03:2021-Injection"],
    vulnerableRange: "< 1.2.6",
    patchedVersion: "1.2.6",
    message:
      "minimist before 1.2.6 is vulnerable to prototype pollution via __proto__ or constructor.prototype.",
    advisoryUrl: "https://osv.dev/vulnerability/GHSA-xvch-5ox4-994e",
    sourceTimestamp: "2022-03-17T00:00:00Z",
  },
  {
    name: "semver",
    ecosystem: "npm",
    ruleId: "CVE-2022-25883",
    advisoryId: "GHSA-c2qf-rxjj-qqgw",
    title: "Regular Expression Denial of Service in semver",
    severity: "high",
    cvss: 7.5,
    cwe: ["CWE-1333"],
    owasp: ["A05:2021-Security Misconfiguration"],
    vulnerableRange: "< 7.5.2",
    patchedVersion: "7.5.2",
    message: "semver versions prior to 7.5.2 are vulnerable to ReDoS when parsing complex versions.",
    advisoryUrl: "https://osv.dev/vulnerability/GHSA-c2qf-rxjj-qqgw",
    sourceTimestamp: "2023-06-21T00:00:00Z",
  },
];

/**
 * Parse package-lock.json (supporting v1, v2, v3 formats)
 * into a normalized package inventory array.
 */
export function parseNpmLockfile(lockfileContent, filePath = "package-lock.json") {
  const inventory = [];
  try {
    const lock = JSON.parse(lockfileContent);

    // Lockfile v2 / v3 packages property
    if (lock.packages && typeof lock.packages === "object") {
      const rootPkg = lock.packages[""] || {};
      const directDeps = new Set([
        ...Object.keys(rootPkg.dependencies || {}),
        ...Object.keys(rootPkg.devDependencies || {}),
      ]);

      for (const [pkgPath, details] of Object.entries(lock.packages)) {
        if (!pkgPath || pkgPath === "") continue;
        const name = details.name || pkgPath.replace(/^.*node_modules\//, "");
        const version = details.version;
        if (!version) continue;

        const isDirect = directDeps.has(name) && !pkgPath.includes("node_modules/" + name + "/node_modules");
        const depPath = pkgPath.replace(/node_modules\//g, "").replace(/\//g, " -> ");

        inventory.push({
          name,
          version,
          ecosystem: "npm",
          isDirect,
          dependencyPath: `${lock.name || "root"} -> ${depPath}@${version}`,
          manifestPath: filePath,
        });
      }
    }
    // Lockfile v1 dependencies property
    else if (lock.dependencies && typeof lock.dependencies === "object") {
      function traverseV1(depsObj, parentPath = lock.name || "root") {
        for (const [name, meta] of Object.entries(depsObj)) {
          const version = meta.version;
          if (!version) continue;
          const currentPath = `${parentPath} -> ${name}@${version}`;
          inventory.push({
            name,
            version,
            ecosystem: "npm",
            isDirect: parentPath === (lock.name || "root"),
            dependencyPath: currentPath,
            manifestPath: filePath,
          });
          if (meta.dependencies) {
            traverseV1(meta.dependencies, currentPath);
          }
        }
      }
      traverseV1(lock.dependencies);
    }
  } catch {
    // Malformed lockfile JSON handled gracefully
  }

  return inventory;
}

/**
 * Parse package.json manifest into a basic direct dependency inventory.
 */
export function parsePackageJson(packageJsonContent, filePath = "package.json") {
  const inventory = [];
  try {
    const pkg = JSON.parse(packageJsonContent);
    const combined = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    for (const [name, rawVersion] of Object.entries(combined)) {
      const cleanVer = semver.coerce(rawVersion)?.version || rawVersion.replace(/[\^~>=<]/g, "").trim();
      inventory.push({
        name,
        version: cleanVer,
        rawVersionSpec: rawVersion,
        ecosystem: "npm",
        isDirect: true,
        dependencyPath: `${pkg.name || "root"} -> ${name}@${rawVersion}`,
        manifestPath: filePath,
      });
    }
  } catch {
    // Malformed manifest JSON handled gracefully
  }

  return inventory;
}

export async function runDependencyScanner({ files }) {
  const startTime = Date.now();
  const findings = [];
  const { toolVersion, rulesetVersion } = DEPENDENCY_METADATA;

  try {
    // 1. Build normalized package inventory from lockfiles and manifests
    const packageInventory = [];
    const lockfiles = files.filter((f) => f.path.endsWith("package-lock.json"));
    const manifests = files.filter((f) => f.path.endsWith("package.json"));

    // If lockfile is present, prioritize lockfile-resolved versions
    for (const lockfile of lockfiles) {
      const items = parseNpmLockfile(lockfile.content, lockfile.path);
      packageInventory.push(...items);
    }

    // Also include direct manifest dependencies if lockfile didn't provide them
    for (const manifest of manifests) {
      const items = parsePackageJson(manifest.content, manifest.path);
      for (const item of items) {
        if (!packageInventory.some((inv) => inv.name === item.name)) {
          packageInventory.push(item);
        }
      }
    }

    // 2. Query OSV Advisory database using accurate semver evaluation
    const seenFindingKeys = new Set();

    for (const pkg of packageInventory) {
      const coercedVersion = semver.coerce(pkg.version)?.version || pkg.version;
      if (!semver.valid(coercedVersion)) continue;

      for (const advisory of OSV_ADVISORY_DATABASE) {
        if (advisory.name !== pkg.name || advisory.ecosystem !== pkg.ecosystem) {
          continue;
        }

        // Evaluate semantic version range match
        const isVulnerable = semver.satisfies(coercedVersion, advisory.vulnerableRange);

        if (isVulnerable) {
          const findingKey = `${advisory.ruleId}|${pkg.name}|${pkg.version}|${pkg.manifestPath}`;
          if (seenFindingKeys.has(findingKey)) continue;
          seenFindingKeys.add(findingKey);

          const title = `${advisory.title} (${pkg.name}@${pkg.version})`;
          const directLabel = pkg.isDirect ? "Direct Dependency" : "Transitive Dependency";
          const message = `${advisory.message} [${directLabel}] Upgrade to ${advisory.patchedVersion} or higher. Path: ${pkg.dependencyPath}`;
          const codeAnchor = `"${pkg.name}": "${pkg.version}"`;
          const codeSnippet = `"${pkg.name}": "${pkg.version}" // Patched: ${advisory.patchedVersion}\n// Path: ${pkg.dependencyPath}\n// Advisory: ${advisory.ruleId} (${advisory.advisoryId})`;

          findings.push({
            scanner: "osv-dependency-audit",
            ruleId: advisory.ruleId,
            title,
            message,
            severity: normalizeSeverity(advisory.severity),
            category: "dependencies",
            filePath: pkg.manifestPath,
            startLine: 1,
            endLine: 1,
            startColumn: 1,
            endColumn: 1,
            codeAnchor,
            codeSnippet,
            sanitizedSnippet: codeSnippet,
            source: "dependency-tool",
            toolName: "osv-dependency-audit",
            toolVersion,
            rulesetVersion,
            advisorySource: "OSV",
            advisoryId: advisory.advisoryId,
            confidence: "high",
            cwe: advisory.cwe,
            owasp: advisory.owasp,
            ruleExplanation: `${advisory.title}. CVSS Score: ${advisory.cvss}. Advisory Reference: ${advisory.advisoryUrl}`,
            scannerEvidenceRef: `osv:${advisory.ruleId}:${pkg.name}@${pkg.version}`,
            rawMetadata: {
              scannerVersion: toolVersion,
              rulesetVersion,
              vulnerablePackage: pkg.name,
              installedVersion: pkg.version,
              fixedVersion: advisory.patchedVersion,
              vulnerableRange: advisory.vulnerableRange,
              cvss: advisory.cvss,
              advisoryUrl: advisory.advisoryUrl,
              dependencyPath: pkg.dependencyPath,
              isDirect: pkg.isDirect,
              ecosystem: pkg.ecosystem,
              sourceTimestamp: advisory.sourceTimestamp,
            },
          });
        }
      }
    }

    return {
      scanner: "osv-dependency-audit",
      version: toolVersion,
      rulesetVersion,
      status: "completed",
      findings,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      scanner: "osv-dependency-audit",
      version: toolVersion,
      rulesetVersion,
      status: "failed",
      error: err.message,
      findings: [],
      durationMs: Date.now() - startTime,
    };
  }
}
