
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  GitBranch,
  FolderPlus,
  Play,
  History,
  Trash2,
  AlertTriangle,
  RefreshCw,
  X,
} from "lucide-react";
import { api } from "../lib/api.js";
import { Button } from "../components/Button.jsx";
import { StatusBadge } from "../components/Badge.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ConnectRepoModal } from "../features/repositories/ConnectRepoModal.jsx";

export function RepositoriesPage() {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [repoToRemove, setRepoToRemove] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [scanningId, setScanningId] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchRepos = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await api.repositories.list();
      setRepositories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load repositories:", err);
      setError(err.message || "Failed to load repositories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const handleStartScan = async (repo) => {
    try {
      setScanningId(repo._id);
      setError("");

      const res = await api.repositories.queueScan(repo._id, {
        branch: repo.defaultBranch || "main",
      });

      navigate(`/scans/${res.scanId}`);
    } catch (err) {
      setError("Failed to queue scan: " + err.message);
      await fetchRepos();
    } finally {
      setScanningId(null);
    }
  };

  const handleRemoveRepository = async () => {
    if (!repoToRemove || removingId) return;

    const repo = repoToRemove;

    try {
      setRemovingId(repo._id);
      setError("");

      await api.repositories.remove(repo._id);

      setRepositories((current) =>
        current.filter((item) => item._id !== repo._id)
      );

      setRepoToRemove(null);
      await fetchRepos();
    } catch (err) {
      setError(err.message || "Failed to remove repository.");
    } finally {
      setRemovingId(null);
    }
  };

  const closeRemoveModal = () => {
    if (removingId) return;
    setRepoToRemove(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Connected Repositories
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage authorized codebases and initiate reproducible commit-pinned scans
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={fetchRepos}
            icon={RefreshCw}
            disabled={loading || Boolean(removingId)}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            onClick={() => setShowConnectModal(true)}
            icon={FolderPlus}
          >
            Connect Repository
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">
          Loading repositories...
        </div>
      ) : repositories.length === 0 ? (
        <EmptyState
          title="No Repositories Connected"
          description="Connect an authorized repository or add the seeded vulnerability fixture to start static analysis."
          actionLabel="Connect Repository"
          onAction={() => setShowConnectModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {repositories.map((repo) => (
            <div
              key={repo._id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-bold text-base text-white truncate max-w-[200px]">
                    {repo.fullName}
                  </span>

                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                    {repo.visibility}
                  </span>
                </div>

                
<div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-2">
  <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
  <span>Branch: {repo.defaultBranch || "main"}</span>
</div>

<div className="mb-4 flex items-center gap-2">
  <span
    className={`inline-block h-2 w-2 rounded-full ${
      repo.connectionStatus === "connected"
        ? "bg-emerald-400"
        : repo.connectionStatus === "disconnected"
          ? "bg-red-400"
          : "bg-amber-400"
    }`}
  />
  <span
    className={`text-xs font-medium ${
      repo.connectionStatus === "connected"
        ? "text-emerald-400"
        : repo.connectionStatus === "disconnected"
          ? "text-red-400"
          : "text-amber-400"
    }`}
  >
    {repo.connectionStatus === "connected"
      ? "GitHub Connected"
      : repo.connectionStatus === "disconnected"
        ? "GitHub Disconnected"
        : "Connection Status Unknown"}
  </span>
</div>

{repo.connectionStatus === "disconnected" && (
  <p className="mb-4 text-xs leading-5 text-red-300">
    GitHub access is unavailable. Reconnect this repository before starting
    another scan. Previous scan results remain available.
  </p>
)}


                {repo.lastScan ? (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 mb-6 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last Status:</span>
                      <StatusBadge status={repo.lastScan.status} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Commit SHA:</span>
                      <span className="font-mono text-cyan-400">
                        {repo.lastScan.commitSha?.slice(0, 7) || "N/A"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Issues:</span>
                      <span className="font-semibold text-slate-200">
                        {repo.lastScan.totalFindings ?? 0} findings
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 mb-6 text-xs text-slate-500 text-center">
                    No scans initiated yet
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStartScan(repo)}
                    loading={scanningId === repo._id}
                    disabled={Boolean(removingId) || Boolean(scanningId) || repo.connectionStatus !== "connected"}
                    icon={Play}
                    className="flex-1"
                  >
                    Start Scan
                  </Button>

                  {repo.lastScan && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/scans/${repo.lastScan.id}`)}
                      disabled={Boolean(removingId)}
                      icon={History}
                    >
                      View Last
                    </Button>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRepoToRemove(repo)}
                  disabled={Boolean(removingId) || Boolean(scanningId)}
                  icon={Trash2}
                  className="w-full"
                >
                  Remove Repository
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showConnectModal && (
        <ConnectRepoModal
          onClose={() => setShowConnectModal(false)}
          onConnected={fetchRepos}
        />
      )}

      {/* Custom dark-themed repository removal confirmation */}
      {repoToRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeRemoveModal();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeRemoveModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-repo-title"
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden"
          >
            <div className="flex items-start gap-4 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
              </div>

              <div className="flex-1 min-w-0">
                <h2
                  id="remove-repo-title"
                  className="text-lg font-bold text-white"
                >
                  Remove Repository?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Remove{" "}
                  <span className="font-semibold text-cyan-400 break-words">
                    {repoToRemove.fullName}
                  </span>{" "}
                  from CodeSense AI?
                </p>
              </div>

              <button
                type="button"
                onClick={closeRemoveModal}
                disabled={Boolean(removingId)}
                aria-label="Close confirmation"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 pb-6">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm leading-6 text-slate-300">
                  The repository connection will be removed. Historical scans
                  and findings will be preserved. This will not uninstall the
                  GitHub App.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="secondary"
                  disabled={Boolean(removingId)}
                  onClick={closeRemoveModal}
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  disabled={Boolean(removingId)}
                  loading={removingId === repoToRemove._id}
                  onClick={handleRemoveRepository}
                  icon={Trash2}
                >
                  {removingId === repoToRemove._id
                    ? "Removing..."
                    : "Remove Repository"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
