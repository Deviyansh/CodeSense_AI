
import React, { useEffect, useState } from "react";
import {
  X,
  Github,
  Sparkles,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  ExternalLink,
  GitBranch,
} from "lucide-react";
import { Button } from "../../components/Button.jsx";
import { api } from "../../lib/api.js";

export function ConnectRepoModal({ onClose, onConnected }) {
  const [installations, setInstallations] = useState([]);
  const [installationId, setInstallationId] = useState("");
  const [repositories, setRepositories] = useState([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingInstallations, setLoadingInstallations] = useState(true);
  const [loadingRepositories, setLoadingRepositories] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadInstallations = async () => {
    try {
      setLoadingInstallations(true);
      setError(null);
      setNotice(null);

      const result = await api.github.getInstallations();
      const available = (Array.isArray(result) ? result : []).filter(
        (item) => !item.suspended
      );

      setInstallations(available);

      if (available.length > 0) {
        setInstallationId((current) =>
          available.some(
            (item) => String(item.installationId) === String(current)
          )
            ? current
            : String(available[0].installationId)
        );
      } else {
        setInstallationId("");
        setRepositories([]);
        setSelectedRepoIds([]);
      }
    } catch (err) {
      setError(err.message || "Could not load GitHub installations.");
    } finally {
      setLoadingInstallations(false);
    }
  };

  useEffect(() => {
    loadInstallations();
  }, []);

  useEffect(() => {
    if (!installationId) {
      setRepositories([]);
      setSelectedRepoIds([]);
      setLoadingRepositories(false);
      return;
    }

    let active = true;

    const loadRepositories = async () => {
      try {
        setLoadingRepositories(true);
        setError(null);
        setNotice(null);
        setRepositories([]);
        setSelectedRepoIds([]);
        setSearchQuery("");

        const result = await api.github.getRepositories(installationId);
        if (!active) return;

        const list = Array.isArray(result?.repositories)
          ? result.repositories
          : [];

        setRepositories(list);

        if (result?.hasMore) {
          setNotice(
            "Only the first 1,000 repositories are shown. Adjust repository access in GitHub to manage the available list."
          );
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Could not load GitHub repositories.");
        }
      } finally {
        if (active) setLoadingRepositories(false);
      }
    };

    loadRepositories();

    return () => {
      active = false;
    };
  }, [installationId]);

  const handleInstallGitHub = () => {
    window.location.assign("/api/v1/github/install");
  };

  const filteredRepositories = repositories.filter((repo) =>
    String(repo.fullName || "")
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase())
  );

  const allFilteredSelected =
    filteredRepositories.length > 0 &&
    filteredRepositories.every((repo) =>
      selectedRepoIds.includes(String(repo.providerRepoId))
    );

  const toggleRepository = (repoId) => {
    const id = String(repoId);

    setSelectedRepoIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  };

  const toggleAllRepositories = () => {
    setSelectedRepoIds((current) => {
      const filteredIds = filteredRepositories.map((repo) =>
        String(repo.providerRepoId)
      );

      if (allFilteredSelected) {
        const filteredSet = new Set(filteredIds);
        return current.filter((id) => !filteredSet.has(id));
      }

      return [...new Set([...current, ...filteredIds])];
    });
  };

  
const handleConnect = async () => {
  if (!installationId || selectedRepoIds.length === 0) {
    setError("Select at least one repository first.");
    return;
  }

  const selectedRepositories = repositories.filter((repo) =>
    selectedRepoIds.includes(String(repo.providerRepoId))
  );

  if (selectedRepositories.length === 0) {
    setError("No valid repositories are selected.");
    return;
  }

  try {
    setLoading(true);
    setError(null);
    setNotice(null);

    const results = await Promise.allSettled(
      selectedRepositories.map((repo) =>
        api.github.connectRepository({
          ...repo,
          installationId: String(installationId),
        })
      )
    );

    const connectedCount = results.filter(
      (result) => result.status === "fulfilled"
    ).length;

    const failures = results
      .map((result, index) => ({
        result,
        repo: selectedRepositories[index],
      }))
      .filter(({ result }) => result.status === "rejected");

    // Refresh the parent from the backend once, after all requests settle.
    if (connectedCount > 0) {
      await onConnected?.();
    }

    if (failures.length > 0) {
      const failedNames = failures
        .slice(0, 3)
        .map(({ repo }) => repo.fullName)
        .join(", ");

      const remaining =
        failures.length > 3 ? ` and ${failures.length - 3} more` : "";

      setSelectedRepoIds(
        failures.map(({ repo }) => String(repo.providerRepoId))
      );

      setError(
        `${connectedCount} connected; ${failures.length} failed. ` +
          `Failed: ${failedNames}${remaining}.`
      );

      return;
    }

    onClose();
  } catch (err) {
    setError(err.message || "Failed to connect repositories.");
  } finally {
    setLoading(false);
  }
};



const handleSeedDemo = async () => {
  try {
    setLoading(true);
    setError(null);
    setNotice(null);

    await api.repositories.seedDemo();
    await onConnected?.();
    onClose();
  } catch (err) {
    setError(err.message || "Failed to add the demo repository.");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <Github className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-lg font-bold text-white">
                Connect Repositories
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose one or more repositories to scan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Your GitHub repositories
            </h3>

            <button
              type="button"
              onClick={loadInstallations}
              disabled={loadingInstallations || loading}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  loadingInstallations ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg border border-rose-900 bg-rose-950/40 text-rose-300 text-xs"
            >
              {error}
            </div>
          )}

          {notice && (
            <div className="p-3 rounded-lg border border-amber-800 bg-amber-950/30 text-amber-200 text-xs">
              {notice}
            </div>
          )}

          {loadingInstallations ? (
            <p className="text-sm text-slate-400">
              Loading GitHub installations...
            </p>
          ) : installations.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5 space-y-3">
              <Github className="w-8 h-8 text-slate-500" />
              <h3 className="text-sm font-semibold text-white">
                Connect your GitHub account
              </h3>
              <p className="text-sm text-slate-400">
                Install CodeSense AI on your GitHub account to choose
                repositories.
              </p>
              <Button
                type="button"
                variant="primary"
                onClick={handleInstallGitHub}
              >
                Install GitHub App
              </Button>
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="github-installation"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  GitHub account
                </label>

                <select
                  id="github-installation"
                  value={installationId}
                  onChange={(event) => setInstallationId(event.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                >
                  {installations.map((installation) => (
                    <option
                      key={installation.installationId}
                      value={String(installation.installationId)}
                    >
                      {installation.accountLogin} ({installation.accountType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search repositories..."
                  aria-label="Search repositories"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={toggleAllRepositories}
                  disabled={
                    loading ||
                    loadingRepositories ||
                    filteredRepositories.length === 0
                  }
                  className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {allFilteredSelected ? "Deselect all shown" : "Select all shown"}
                </button>

                <span className="text-xs text-slate-400">
                  {selectedRepoIds.length} selected · {repositories.length} available
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden">
                {loadingRepositories ? (
                  <div className="p-6 text-center text-sm text-slate-400">
                    Loading repositories...
                  </div>
                ) : filteredRepositories.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400">
                    {repositories.length === 0
                      ? "No accessible repositories found."
                      : "No repositories match your search."}
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-800">
                    {filteredRepositories.map((repo) => {
                      const id = String(repo.providerRepoId);
                      const selected = selectedRepoIds.includes(id);

                      return (
                        <label
                          key={id}
                          className={`flex items-center gap-3 p-3.5 cursor-pointer transition-colors ${
                            selected
                              ? "bg-cyan-950/30"
                              : "hover:bg-slate-800/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleRepository(id)}
                            disabled={loading}
                            className="h-4 w-4 accent-cyan-500 shrink-0"
                          />

                          <GitBranch className="w-4 h-4 text-slate-500 shrink-0" />

                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-slate-200 font-medium truncate">
                              {repo.fullName}
                            </span>
                            <span className="block text-xs text-slate-500 mt-0.5">
                              {repo.visibility}
                              {repo.defaultBranch
                                ? ` · ${repo.defaultBranch}`
                                : ""}
                            </span>
                          </span>

                          {selected && (
                            <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <a
                href={`https://github.com/settings/installations/${encodeURIComponent(
                  installationId
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Manage repository access on GitHub
              </a>
            </>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 p-5 sm:px-6 border-t border-slate-800 bg-slate-950/60">
          

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConnect}
              loading={loading}
              disabled={
                loading ||
                loadingInstallations ||
                loadingRepositories ||
                installations.length === 0 ||
                selectedRepoIds.length === 0
              }
            >
              {loading
                ? "Connecting..."
                : `Connect Selected (${selectedRepoIds.length})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
