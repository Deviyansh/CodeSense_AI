
import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Shield,
  Download,
  GitCompare,
  ArrowLeft,
  FileText,
  Unplug,
} from "lucide-react";
import { api } from "../lib/api.js";
import { Button } from "../components/Button.jsx";
import { StatusBadge } from "../components/Badge.jsx";
import { ScanProgress } from "../features/scans/ScanProgress.jsx";
import { ScanSummaryCard } from "../features/scans/ScanSummaryCard.jsx";
import { FindingFilters } from "../features/findings/FindingFilters.jsx";
import { FindingList } from "../features/findings/FindingList.jsx";
import { FindingDetailModal } from "../features/findings/FindingDetailModal.jsx";
import { ScanDiffModal } from "../features/scans/ScanDiffModal.jsx";
import { ErrorState } from "../components/ErrorState.jsx";

export function ScanDetailPage() {
  const { id } = useParams();

  const [scan, setScan] = useState(null);
  const [findings, setFindings] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [availableScans, setAvailableScans] = useState([]);
  const [exporting, setExporting] = useState(false);

  const loadScanData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const scanData = await api.scans.get(id);
      setScan(scanData);

      // Use the user's complete scan history. This includes scans from
      // repositories that are no longer connected.
      try {
        const history = await api.scans.list();
        const safeHistory = Array.isArray(history) ? history : [];

        const sameRepositoryScans = safeHistory.filter(
          (item) =>
            String(item.repositoryId) === String(scanData.repositoryId)
        );

        setAvailableScans(sameRepositoryScans);
      } catch (historyError) {
        console.warn("Could not load scan comparison history:", historyError);
        setAvailableScans([]);
      }

      if (
        scanData.status === "completed" ||
        scanData.status === "failed"
      ) {
        const findingsData = await api.scans.getFindings(id, filters);
        setFindings(
          Array.isArray(findingsData)
            ? findingsData
            : findingsData?.items || []
        );
        setLoading(false);
      }
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [id, filters.severity, filters.category, filters.search]);

  useEffect(() => {
    let timer;

    const fetchAndPoll = async () => {
      await loadScanData();

      // Continue polling only while this scan is queued or running.
      // The next fetch updates the scan status and findings.
      const current = await api.scans.get(id).catch(() => null);

      if (current && ["queued", "running", "processing"].includes(current.status)) {
        timer = setTimeout(fetchAndPoll, 1500);
      }
    };

    fetchAndPoll();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [id, loadScanData]);

  const handleExport = async (format) => {
    try {
      setExporting(true);

      const content = await api.scans.exportReport(id, format);

      const blob = new Blob(
        [
          typeof content === "object"
            ? JSON.stringify(content, null, 2)
            : content,
        ],
        {
          type:
            format === "markdown"
              ? "text/markdown;charset=utf-8"
              : "application/json",
        }
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `codesense-report-${id}.${
        format === "markdown" ? "md" : "json"
      }`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export report: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !scan && !error) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          Loading scan report...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <ErrorState
          error={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const repository = scan?.repository;
  const repositoryConnected =
    repository?.connected ??
    scan?.repositoryConnected ??
    true;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/repositories">
            <button
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Back to repositories"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {repository?.fullName || scan?.repoFullName || "Scan Report"}
              </h1>

              {scan && <StatusBadge status={scan.status} />}

              {!repositoryConnected && (
                <span className="inline-flex items-center gap-1 rounded border border-amber-700/40 bg-amber-950/30 px-2 py-1 text-xs text-amber-300">
                  <Unplug className="w-3.5 h-3.5" />
                  Disconnected
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap text-xs font-mono text-slate-400 mt-1">
              <span>Branch: {scan?.branch || "—"}</span>
              <span>•</span>
              <span className="text-cyan-400">
                SHA: {scan?.commitSha?.slice(0, 10) || "—"}
              </span>
              <span>•</span>
              <span>
                {scan?.createdAt
                  ? new Date(scan.createdAt).toLocaleString()
                  : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {availableScans.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiffModal(true)}
              icon={GitCompare}
            >
              Compare Scans
            </Button>
          )}

          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              onClick={() => handleExport("markdown")}
              disabled={exporting || scan?.status !== "completed"}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors flex items-center gap-1.5 disabled:opacity-40"
              title="Download report in Markdown format"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export .MD</span>
            </button>

            <button
              onClick={() => handleExport("json")}
              disabled={exporting || scan?.status !== "completed"}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors flex items-center gap-1.5 disabled:opacity-40"
              title="Download report in JSON format"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      {!repositoryConnected && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-4 text-sm text-amber-200">
          This repository is disconnected. You can still inspect this saved
          scan and its findings, but starting a new scan requires reconnecting
          the repository.
        </div>
      )}

      {scan && (
        <ScanProgress
          status={scan.status}
          stage={scan.stage}
          progress={scan.progress}
        />
      )}

      {scan?.status === "failed" && (
        <div className="p-4 rounded-xl border border-rose-900 bg-rose-950/40 text-rose-300 text-xs">
          <strong>Scan Failed:</strong>{" "}
          {scan.errorMessage || "Unknown analyzer error"}{" "}
          (Code: {scan.errorCode || "—"})
        </div>
      )}

      {scan?.status === "completed" && (
        <ScanSummaryCard
          summary={scan.summary}
          scannerVersions={scan.scannerVersions}
        />
      )}

      {scan?.status === "completed" && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Normalized Findings ({findings.length})</span>
            </h2>

            <span className="text-xs text-slate-500">
              Click a finding to view evidence and available AI remediation.
            </span>
          </div>

          <FindingFilters
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters({})}
          />

          <FindingList
            findings={findings}
            onSelectFinding={(findingId) =>
              setSelectedFindingId(findingId)
            }
          />
        </div>
      )}

      {selectedFindingId && (
        <FindingDetailModal
          findingId={selectedFindingId}
          onClose={() => setSelectedFindingId(null)}
        />
      )}

      {showDiffModal && scan && (
        <ScanDiffModal
          baseScan={scan}
          availableScans={availableScans}
          onClose={() => setShowDiffModal(false)}
        />
      )}
    </div>
  );
}
