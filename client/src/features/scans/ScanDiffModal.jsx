import React, { useState, useEffect } from "react";
import { X, GitCompare, PlusCircle, CheckCircle, Repeat, ArrowRight } from "lucide-react";
import { SeverityBadge } from "../../components/Badge.jsx";
import { Button } from "../../components/Button.jsx";
import { api } from "../../lib/api.js";

export function ScanDiffModal({ baseScan, availableScans = [], onClose }) {
  const [selectedTargetId, setSelectedTargetId] = useState(
    availableScans.find((s) => s._id !== baseScan._id)?._id || ""
  );
  const [diffData, setDiffData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("new"); // "new" | "resolved" | "persistent"

  useEffect(() => {
    async function loadDiff() {
      if (!selectedTargetId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await api.scans.compare(baseScan._id, selectedTargetId);
        setDiffData(res);
      } catch (err) {
        setError(err.message || "Failed to compare scans");
      } finally {
        setLoading(false);
      }
    }
    loadDiff();
  }, [baseScan._id, selectedTargetId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <GitCompare className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Compare Scan Reports</h2>
              <p className="text-xs text-slate-400">
                Detect regressions and verified remediations across commit SHAs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Selector Bar */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-sans">Base Scan:</span>
            <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700">
              SHA: {baseScan.commitSha?.slice(0, 7)}
            </span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-sans">Compare Target:</span>
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="px-3 py-1.5 rounded bg-slate-800 text-slate-200 border border-slate-700 focus:outline-none"
            >
              {availableScans
                .filter((s) => s._id !== baseScan._id)
                .map((s) => (
                  <option key={s._id} value={s._id}>
                    SHA {s.commitSha?.slice(0, 7)} • {new Date(s.createdAt).toLocaleDateString()}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-400">Computing fingerprint diffs...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-rose-900 bg-rose-950/30 text-rose-300 text-sm">
              {error}
            </div>
          ) : diffData ? (
            <>
              {/* Summary Badges */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setActiveTab("new")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    activeTab === "new"
                      ? "border-rose-500 bg-rose-950/30 ring-1 ring-rose-500"
                      : "border-slate-800 bg-slate-900/40 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mb-1">
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>New Findings</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {diffData.diffSummary.newCount}
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("resolved")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    activeTab === "resolved"
                      ? "border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500"
                      : "border-slate-800 bg-slate-900/40 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mb-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Resolved</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {diffData.diffSummary.resolvedCount}
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("persistent")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    activeTab === "persistent"
                      ? "border-amber-500 bg-amber-950/30 ring-1 ring-amber-500"
                      : "border-slate-800 bg-slate-900/40 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium mb-1">
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Persistent</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {diffData.diffSummary.persistentCount}
                  </div>
                </button>
              </div>

              {/* Items in active tab */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {activeTab === "new"
                    ? "Newly Introduced Issues (Regressions)"
                    : activeTab === "resolved"
                    ? "Remediated Issues (Fix Verified)"
                    : "Unchanged Findings"}
                </h3>

                {diffData[
                  activeTab === "new"
                    ? "newFindings"
                    : activeTab === "resolved"
                    ? "resolvedFindings"
                    : "persistentFindings"
                ].length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                    No findings in this category.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {diffData[
                      activeTab === "new"
                        ? "newFindings"
                        : activeTab === "resolved"
                        ? "resolvedFindings"
                        : "persistentFindings"
                    ].map((f) => (
                      <div
                        key={f.fingerprint}
                        className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <SeverityBadge severity={f.severity} />
                          <div>
                            <span className="font-semibold text-slate-200">{f.title}</span>
                            <span className="block text-[11px] font-mono text-slate-500">
                              {f.filePath}:{f.startLine} • {f.ruleId}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-slate-400 text-[11px]">{f.scanner}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Select a target scan to calculate comparison.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Comparison
          </Button>
        </div>
      </div>
    </div>
  );
}
