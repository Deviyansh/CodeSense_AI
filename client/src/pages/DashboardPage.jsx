
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GitBranch,
  Play,
  ArrowRight,
  Sparkles,
  FolderPlus,
  Clock,
  Unplug,
} from "lucide-react";
import { api } from "../lib/api.js";
import { Button } from "../components/Button.jsx";
import { StatusBadge } from "../components/Badge.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ConnectRepoModal } from "../features/repositories/ConnectRepoModal.jsx";

export function DashboardPage() {
  const [repositories, setRepositories] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [metrics, setMetrics] = useState({
    totalScans: 0,
    criticalIssues: 0,
    highIssues: 0,
    totalIssues: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [reposResult, scansResult] = await Promise.all([
        api.repositories.list(),
        api.scans.list(),
      ]);

      const safeRepos = Array.isArray(reposResult) ? reposResult : [];
      const safeScans = Array.isArray(scansResult) ? scansResult : [];

      setRepositories(safeRepos);

      const allScans = safeScans
        .map((scan) => ({
          ...scan,
          repoFullName:
            scan.repoFullName ||
            scan.repository?.fullName ||
            "Unknown repository",
          repositoryConnected:
            scan.repositoryConnected ??
            scan.repository?.connected ??
            true,
        }))
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );

      setRecentScans(allScans);

      let totalCritical = 0;
      let totalHigh = 0;
      let totalIssues = 0;

      for (const scan of allScans) {
        if (scan.summary) {
          totalCritical += scan.summary.critical || 0;
          totalHigh += scan.summary.high || 0;
          totalIssues += scan.summary.total || 0;
        }
      }

      setMetrics({
        totalScans: allScans.length,
        criticalIssues: totalCritical,
        highIssues: totalHigh,
        totalIssues,
      });
    } catch (error) {
      console.error("Dashboard data load error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleFocus = () => loadData();
    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, [loadData]);

  const handleStartScan = async (repoId) => {
    try {
      const result = await api.repositories.queueScan(repoId, {
        branch: "main",
      });

      navigate(`/scans/${result.scanId}`);
    } catch (error) {
      alert("Failed to queue scan: " + error.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 p-8 glass-glow">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Deterministic Analysis + AI Remediation</span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Elevate Code Security with Evidence-Backed AI Review
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Run automated AST checks, Semgrep security patterns, Gitleaks
            secret scans, and dependency vulnerability audits. Inspect
            grounded explanations and unified diff patches before merging.
          </p>

          <div className="pt-2 flex items-center gap-3 flex-wrap">
            <Button
              variant="primary"
              onClick={() => setShowConnectModal(true)}
              icon={FolderPlus}
            >
              Connect Repository
            </Button>

            <Link to="/repositories">
              <Button variant="outline" icon={GitBranch}>
                View All Repositories
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur">
          <span className="text-xs font-medium text-slate-400">
            Total Scans Executed
          </span>
          <div className="text-3xl font-bold font-mono text-white mt-1">
            {metrics.totalScans}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-rose-900/30 bg-rose-950/20 backdrop-blur">
          <span className="text-xs font-medium text-rose-300">
            Critical Vulnerabilities
          </span>
          <div className="text-3xl font-bold font-mono text-rose-400 mt-1">
            {metrics.criticalIssues}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-orange-900/30 bg-orange-950/20 backdrop-blur">
          <span className="text-xs font-medium text-orange-300">
            High Risk Issues
          </span>
          <div className="text-3xl font-bold font-mono text-orange-400 mt-1">
            {metrics.highIssues}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-cyan-900/30 bg-cyan-950/20 backdrop-blur">
          <span className="text-xs font-medium text-cyan-300">
            Total Findings Stored
          </span>
          <div className="text-3xl font-bold font-mono text-cyan-400 mt-1">
            {metrics.totalIssues}
          </div>
        </div>
      </div>

      {repositories.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-cyan-400" />
              <span>Connected Repositories ({repositories.length})</span>
            </h2>

            <Link
              to="/repositories"
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              Manage Repositories{" "}
              <ArrowRight className="inline w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {repositories.slice(0, 3).map((repo) => (
              <div
                key={repo._id}
                className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="font-semibold text-sm text-slate-100 truncate">
                      {repo.fullName}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {repo.visibility}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-mono mb-4">
                    Branch: {repo.defaultBranch}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-xs text-slate-500">
                    {repo.lastScan
                      ? `Last: ${repo.lastScan.totalFindings} findings`
                      : "Never scanned"}
                  </span>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStartScan(repo._id)}
                    icon={Play}
                  >
                    Scan Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Recent Scans ({recentScans.length})</span>
        </h2>

        {loading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
            Loading scan history...
          </div>
        ) : recentScans.length === 0 ? (
          <EmptyState
            title="No Scans Found"
            description="Connect a repository and run a scan to build your scan history."
            actionLabel="Connect Repository"
            onAction={() => setShowConnectModal(true)}
          />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase font-semibold">
                    <th className="py-3 px-4">Repository</th>
                    <th className="py-3 px-4">Commit SHA</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Findings</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60">
                  {recentScans.map((scan) => (
                    <tr
                      key={scan._id}
                      onClick={() => navigate(`/scans/${scan._id}`)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        <div className="flex items-center gap-2">
                          <span>{scan.repoFullName}</span>
                          {!scan.repositoryConnected && (
                            <span
                              title="This repository is no longer connected"
                              className="inline-flex items-center gap-1 rounded border border-amber-700/40 bg-amber-950/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
                            >
                              <Unplug className="h-3 w-3" />
                              Disconnected
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-cyan-400">
                        {scan.commitSha?.slice(0, 7) || "—"}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={scan.status} />
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {scan.summary?.total || 0} issues
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {scan.createdAt
                          ? new Date(scan.createdAt).toLocaleString()
                          : "—"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1">
                          View Report <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showConnectModal && (
        <ConnectRepoModal
          onClose={() => setShowConnectModal(false)}
          onConnected={loadData}
        />
      )}
    </div>
  );
}
