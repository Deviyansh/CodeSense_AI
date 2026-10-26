import React, { useState, useEffect } from "react";
import { X, Sparkles, Shield, AlertCircle, FileCode, CheckCircle, Terminal, HelpCircle, Copy, Check } from "lucide-react";
import { SeverityBadge } from "../../components/Badge.jsx";
import { CodeSnippet } from "../../components/CodeSnippet.jsx";
import { DiffViewer } from "../../components/DiffViewer.jsx";
import { Button } from "../../components/Button.jsx";
import { api } from "../../lib/api.js";

export function FindingDetailModal({ findingId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedFp, setCopiedFp] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      if (!findingId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await api.findings.get(findingId);
        setData(res);
      } catch (err) {
        setError(err.message || "Failed to load finding details");
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [findingId]);

  const handleRequestReview = async () => {
    try {
      setReviewLoading(true);
      const review = await api.findings.requestReview(findingId);
      setData((prev) => ({ ...prev, aiReview: review }));
    } catch (err) {
      setError(err.message || "AI review generation failed");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleCopyFingerprint = (fp) => {
    navigator.clipboard.writeText(fp);
    setCopiedFp(true);
    setTimeout(() => setCopiedFp(false), 2000);
  };

  if (!findingId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex-1 pr-6">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {data?.finding && <SeverityBadge severity={data.finding.severity} />}
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {data?.finding?.category?.toUpperCase()}
              </span>
              <span className="text-xs font-mono text-cyan-400">
                {data?.finding?.scanner} • {data?.finding?.ruleId}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {data?.finding?.title || "Finding Details"}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-400">Loading analysis evidence...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 text-rose-300 text-sm">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Section 1: Deterministic Static Evidence */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-200">
                      Deterministic Scanner Evidence
                    </h3>
                  </div>
                  <button
                    onClick={() => handleCopyFingerprint(data.finding.fingerprint)}
                    className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200"
                    title="Fingerprint hash"
                  >
                    <span>FP: {data.finding.fingerprint.slice(0, 10)}...</span>
                    {copiedFp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {data.finding.message}
                </p>

                {/* Code Snippet with line context */}
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Location: {data.finding.filePath}:{data.finding.startLine}</span>
                  </div>
                  <CodeSnippet
                    snippet={data.finding.codeSnippet}
                    startLine={data.finding.startLine}
                    filePath={data.finding.filePath}
                  />
                </div>
              </div>

              {/* Section 2: AI-Assisted Review & Remediation */}
              <div className="rounded-xl border border-indigo-900/50 bg-indigo-950/15 p-5 space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="text-sm font-semibold text-indigo-200">
                        AI-Assisted Explanation & Remediation
                      </h3>
                      <p className="text-xs text-indigo-300/70">
                        Grounded in static analysis findings • Requires developer confirmation
                      </p>
                    </div>
                  </div>

                  {!data.aiReview && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRequestReview}
                      loading={reviewLoading}
                      icon={Sparkles}
                    >
                      Generate AI Review
                    </Button>
                  )}
                </div>

                {data.aiReview ? (
                  <div className="space-y-4 mt-2">
                    {/* Confidence & model meta */}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-semibold text-slate-300">Confidence:</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium capitalize">
                        {data.aiReview.confidence || "high"}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400 font-mono">
                        Provider: {data.aiReview.provider}
                      </span>
                    </div>

                    {/* Summary */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Executive Summary
                      </h4>
                      <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                        {data.aiReview.summary}
                      </p>
                    </div>

                    {/* Why it matters */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Security & System Impact
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                        {data.aiReview.whyItMatters}
                      </p>
                    </div>

                    {/* Suggested Patch Diff */}
                    {data.aiReview.suggestedFix && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>Suggested Patch (Unified Diff)</span>
                        </h4>
                        <DiffViewer
                          diffText={data.aiReview.suggestedFix}
                          filePath={data.finding.filePath}
                        />
                      </div>
                    )}

                    {/* Assumptions & Validation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {data.aiReview.assumptions?.length > 0 && (
                        <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                          <h5 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Model Assumptions</span>
                          </h5>
                          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                            {data.aiReview.assumptions.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {data.aiReview.validationSteps?.length > 0 && (
                        <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                          <h5 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Validation Checklist</span>
                          </h5>
                          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                            {data.aiReview.validationSteps.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800 text-center py-6">
                    <p className="text-sm text-slate-400 mb-3">
                      Click the button above to generate a grounded explanation, impact analysis, and unified diff remediation.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRequestReview}
                      loading={reviewLoading}
                      icon={Sparkles}
                    >
                      Analyze with AI
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            CodeSense AI Platform • Decision support engine
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
