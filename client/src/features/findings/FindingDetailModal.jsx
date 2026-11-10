import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Shield,
  AlertCircle,
  FileCode,
  CheckCircle,
  Terminal,
  HelpCircle,
  Copy,
  Check,
  Cpu,
  Bookmark,
  MessageSquare,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { SeverityBadge } from "../../components/Badge.jsx";
import { CodeSnippet } from "../../components/CodeSnippet.jsx";
import { DiffViewer } from "../../components/DiffViewer.jsx";
import { Button } from "../../components/Button.jsx";
import { api } from "../../lib/api.js";

export function FindingDetailModal({ findingId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [validateLoading, setValidateLoading] = useState(false);
  const [validationReport, setValidationReport] = useState(null);
  const [triageState, setTriageState] = useState("open");
  const [triageAssignee, setTriageAssignee] = useState("");
  const [triageComment, setTriageComment] = useState("");
  const [triageSaving, setTriageSaving] = useState(false);
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
        if (res.finding) {
          setTriageState(res.finding.state || "open");
          setTriageAssignee(res.finding.assignee || "");
        }
        if (res.patchValidation) {
          setValidationReport(res.patchValidation);
        }
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

  const handleValidatePatch = async () => {
    try {
      setValidateLoading(true);
      const report = await api.findings.validatePatch(findingId);
      setValidationReport(report);
    } catch (err) {
      alert("Patch validation error: " + err.message);
    } finally {
      setValidateLoading(false);
    }
  };

  const handleSaveTriage = async (newState) => {
    try {
      setTriageSaving(true);
      const stateToSave = newState || triageState;
      const updated = await api.findings.triage(findingId, {
        state: stateToSave,
        assignee: triageAssignee,
        comment: triageComment.trim() || undefined,
      });
      setData((prev) => ({ ...prev, finding: updated }));
      setTriageState(updated.state);
      setTriageComment("");
    } catch (err) {
      alert("Failed to update triage: " + err.message);
    } finally {
      setTriageSaving(false);
    }
  };

  const handleCopyFingerprint = (fp) => {
    navigator.clipboard.writeText(fp);
    setCopiedFp(true);
    setTimeout(() => setCopiedFp(false), 2000);
  };

  if (!findingId) return null;

  const finding = data?.finding;
  const aiReview = data?.aiReview;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex-1 pr-6">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {finding && <SeverityBadge severity={finding.severity} />}
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                {finding?.category}
              </span>
              <span className="text-xs font-mono text-cyan-400">
                {finding?.scanner} • {finding?.ruleId}
              </span>
              {finding?.advisoryId && (
                <span className="text-xs font-mono text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/60">
                  {finding.advisoryId}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {finding?.title || "Finding Details"}
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
          ) : finding ? (
            <>
              {/* Section 1: Provenance & Evidence */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-200">
                      Deterministic Scanner Evidence & Provenance
                    </h3>
                  </div>
                  <button
                    onClick={() => handleCopyFingerprint(finding.fingerprint)}
                    className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200"
                    title="Fingerprint hash"
                  >
                    <span>FP: {finding.fingerprint?.slice(0, 10)}...</span>
                    {copiedFp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Tool Engine</span>
                    <span className="text-slate-300 font-semibold">{finding.toolName || finding.scanner}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tool Version</span>
                    <span className="text-slate-300 font-semibold">{finding.toolVersion || "standard"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Ruleset</span>
                    <span className="text-slate-300 font-semibold">{finding.rulesetVersion || "standard"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Confidence</span>
                    <span className="text-emerald-400 font-semibold uppercase">{finding.confidence || "high"}</span>
                  </div>
                </div>

                {(finding.cwe?.length > 0 || finding.owasp?.length > 0) && (
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {finding.cwe?.map((cwe, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-blue-950/50 border border-blue-800 text-blue-300 font-mono">
                        {cwe}
                      </span>
                    ))}
                    {finding.owasp?.map((owasp, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-purple-950/50 border border-purple-800 text-purple-300 font-mono">
                        {owasp}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-sm text-slate-300 leading-relaxed">
                  {finding.message}
                </p>

                {/* Code Snippet with line context */}
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Location: {finding.filePath}:{finding.startLine}</span>
                  </div>
                  <CodeSnippet
                    snippet={finding.codeSnippet}
                    startLine={finding.startLine}
                    filePath={finding.filePath}
                  />
                </div>
              </div>

              {/* Section 2: Triage & Lifecycle Controls */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-slate-200">
                      Triage & Finding Lifecycle
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                    Status: {finding.status || "OPEN"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 font-medium block mb-1">Triage State</label>
                    <select
                      value={triageState}
                      onChange={(e) => {
                        setTriageState(e.target.value);
                        handleSaveTriage(e.target.value);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none"
                    >
                      <option value="open">Open (Active Finding)</option>
                      <option value="fixed">Fixed (Resolved)</option>
                      <option value="accepted_risk">Accepted Risk</option>
                      <option value="false_positive">False Positive</option>
                      <option value="suppressed">Suppressed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 font-medium block mb-1">Assignee</label>
                    <input
                      type="text"
                      placeholder="Assign to team member..."
                      value={triageAssignee}
                      onChange={(e) => setTriageAssignee(e.target.value)}
                      onBlur={() => handleSaveTriage(triageState)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Comments Thread */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Audit Notes & Comments ({finding.comments?.length || 0})</span>
                  </span>

                  {finding.comments?.length > 0 && (
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {finding.comments.map((c, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                          <div className="flex items-center justify-between text-slate-400 mb-1">
                            <span className="font-semibold text-slate-300">{c.author}</span>
                            <span className="text-[10px]">{new Date(c.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-300">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add an audit triage note..."
                      value={triageComment}
                      onChange={(e) => setTriageComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && triageComment.trim()) handleSaveTriage();
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveTriage()}
                      disabled={!triageComment.trim() || triageSaving}
                      loading={triageSaving}
                    >
                      Post Note
                    </Button>
                  </div>
                </div>
              </div>

              {/* Section 3: AI-Assisted Review & Remediation */}
              <div className="rounded-xl border border-indigo-900/50 bg-indigo-950/15 p-5 space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="text-sm font-semibold text-indigo-200">
                        AI Review & Remediation Workflow
                      </h3>
                      <p className="text-xs text-indigo-300/70">
                        Evidence-grounded explanations • Candidate patch generation
                      </p>
                    </div>
                  </div>

                  {!aiReview && (
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

                {aiReview ? (
                  <div className="space-y-4 mt-2">
                    {/* Provider mode badge */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-semibold text-slate-300">Provider Engine:</span>
                      <span className={`px-2 py-0.5 rounded font-mono font-medium ${
                        aiReview.providerMode === "model"
                          ? "bg-purple-950/60 text-purple-300 border border-purple-800"
                          : "bg-cyan-950/60 text-cyan-300 border border-cyan-800"
                      }`}>
                        {aiReview.providerMode === "model" ? "Gemini LLM (Model)" : "Deterministic Fallback Engine"}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400 font-mono">
                        Confidence: <strong className="text-emerald-400 uppercase">{aiReview.confidence || "high"}</strong>
                      </span>
                    </div>

                    {/* Summary */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Executive Summary
                      </h4>
                      <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                        {aiReview.summary}
                      </p>
                    </div>

                    {/* Why it matters */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Security & System Impact
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                        {aiReview.whyItMatters}
                      </p>
                    </div>

                    {/* Suggested Patch Diff */}
                    {aiReview.suggestedFix && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>Suggested Patch (Unified Diff)</span>
                        </h4>
                        <DiffViewer
                          diffText={aiReview.suggestedFix}
                          filePath={finding.filePath}
                        />
                      </div>
                    )}

                    {/* Controlled Patch Validation Pipeline */}
                    {aiReview.suggestedFix && (
                      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-emerald-400" />
                            <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                              Automated Patch Validation Pipeline
                            </h5>
                          </div>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleValidatePatch}
                            loading={validateLoading}
                            icon={CheckCircle}
                          >
                            {validationReport ? "Re-validate Patch" : "Validate Candidate Patch"}
                          </Button>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                          Validates candidate diff in an isolated disposable sandbox: tests workspace boundary constraints, runs JavaScript syntax checks, and reruns static analyzer rules.
                        </p>

                        {validationReport && (
                          <div className="space-y-3 pt-2 border-t border-slate-800">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-slate-300">Validation Outcome:</span>
                              <span
                                className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${
                                  validationReport.outcome === "passed"
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                    : validationReport.outcome === "failed"
                                    ? "bg-rose-950 text-rose-400 border border-rose-800"
                                    : "bg-amber-950 text-amber-400 border border-amber-800"
                                }`}
                              >
                                {validationReport.outcome}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                Hash: {validationReport.patchHash?.slice(0, 10)}...
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {validationReport.checks?.map((chk, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 p-2 rounded bg-slate-950/40 border border-slate-800/80 text-xs"
                                >
                                  {chk.passed ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                  )}
                                  <div>
                                    <span className="font-semibold text-slate-200">{chk.name}: </span>
                                    <span className={chk.passed ? "text-slate-300" : "text-rose-300"}>
                                      {chk.message}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-[11px] text-amber-300">
                              <strong>Human Review Policy:</strong> AI-generated diffs are proposals, not trusted code. Patches are never auto-merged. Explicit developer review and verification are required before branch or PR creation.
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Assumptions & Validation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {aiReview.assumptions?.length > 0 && (
                        <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                          <h5 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Model Assumptions</span>
                          </h5>
                          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                            {aiReview.assumptions.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiReview.validationSteps?.length > 0 && (
                        <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                          <h5 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Recommended Validation Steps</span>
                          </h5>
                          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                            {aiReview.validationSteps.map((s, i) => (
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
                      Generate an evidence-grounded explanation, system impact summary, and candidate unified diff fix.
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
          <span className="text-xs text-slate-500 font-mono">
            CodeSense AI Platform • Evidence-First Decision Support
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
