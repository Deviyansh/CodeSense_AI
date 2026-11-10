import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Shield,
  Download,
  GitCompare,
  ArrowLeft,
  FileText,
  Unplug,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
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
  const [cancelling, setCancelling] = useState(false);
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
        scanData.status === "failed" ||
        scanData.status === "cancelled"
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
  }, [id, filters.severity, filters.category, filters.scanner, filters.state, filters.search]);

  useEffect(() => {
    let timer;

    const fetchAndPoll = async () => {
      await loadScanData();

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

  const handleCancelScan = async () => {
    if (!window.confirm("Are you sure you want to cancel this scan in progress?")) return;
    try {
      setCancelling(true);
      const res = await api.scans.cancel(id);
      setScan(res);
      await loadScanData();
    } catch (err) {
      alert("Failed to cancel scan: " + err.message);
    } finally {
      setCancelling(false);
    }
  };

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

  const scannersList = scan?.scanners || [];
  const anyScannerFailed = scannersList.some(
    (s) => s.status === "failed" || s.status === "timed_out" || s.status === "partial"
  );

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
          {["queued", "running"].includes(scan?.status) && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancelScan}
              loading={cancelling}
              icon={XCircle}
            >
              Cancel Scan
            </Button>
          )}

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

      {anyScannerFailed && (
        <div className="rounded-xl border border-rose-800/60 bg-rose-950/30 p-4 text-sm text-rose-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <strong>Partial Scanner Coverage:</strong> One or more scanner tools reported an execution error or timed out during this scan. Review the Scanner Execution Status below. Prior findings from affected tools will not be marked resolved.
          </div>
        </div>
      )}

      {scan && (
        <ScanProgress
          status={scan.status}
          stage={scan.stage}
          progress={scan.progress}
        />
      )}

      {/* Scanner Provenance & Execution Details */}
      {scannersList.length > 0 && (
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Scanner Tool Provenance & Engine Execution Status</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {scannersList.length} Engines Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {scannersList.map((sc, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border text-xs ${
                  sc.status === "completed"
                    ? "border-slate-800 bg-slate-950/40 text-slate-300"
                    : "border-rose-900/60 bg-rose-950/20 text-rose-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-white uppercase">{sc.scanner}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                      sc.status === "completed"
                        ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                        : "bg-rose-950/60 text-rose-400 border border-rose-800/60"
                    }`}
                  >
                    {sc.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono space-y-0.5">
                  <div>Tool: {sc.version}</div>
                  <div>Ruleset: {sc.rulesetVersion || "standard"}</div>
                  <div>Findings: {sc.findingsCount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {scan?.status === "cancelled" && (
        <div className="p-4 rounded-xl border border-amber-900 bg-amber-950/40 text-amber-300 text-xs">
          <strong>Scan Cancelled:</strong> This scan was aborted upon user request. Historical findings up to the cancellation point are preserved.
        </div>
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
              Click a finding to inspect deterministic evidence, AI review, and test patch validation.
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
          onClose={() => {
            setSelectedFindingId(null);
            loadScanData();
          }}
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
