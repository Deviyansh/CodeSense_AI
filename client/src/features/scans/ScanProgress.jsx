import React from "react";
import { CheckCircle2, CircleDashed, AlertCircle, FileCode, Search, Key, Sparkles, Database } from "lucide-react";

export function ScanProgress({ status, stage, progress = 0 }) {
  const stages = [
    { key: "intake", label: "Source Intake", icon: FileCode },
    { key: "static_analysis", label: "AST & Semgrep", icon: Search },
    { key: "secret_scan", label: "Gitleaks & Secrets", icon: Key },
    { key: "normalization", label: "Deduplication", icon: Sparkles },
    { key: "persistence", label: "Persist Report", icon: Database },
  ];

  const getStageStatus = (stageKey) => {
    if (status === "completed") return "completed";
    if (status === "failed") return stageKey === stage ? "failed" : "pending";

    const order = ["queued", "intake", "static_analysis", "secret_scan", "normalization", "persistence", "completed"];
    const currentIndex = order.indexOf(stage);
    const thisIndex = order.indexOf(stageKey);

    if (thisIndex < currentIndex) return "completed";
    if (thisIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">Analysis Pipeline Progress</span>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
            {progress}%
          </span>
        </div>
        <span className="text-xs font-medium text-slate-400 capitalize">
          Current stage: <strong className="text-slate-200 font-mono">{stage || status}</strong>
        </span>
      </div>

      {/* Progress track */}
      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-6">
        <div
          className={`h-full transition-all duration-500 ${
            status === "failed"
              ? "bg-rose-500"
              : status === "completed"
              ? "bg-emerald-500"
              : "bg-gradient-to-r from-cyan-500 to-blue-500 animate-pulse"
          }`}
          style={{ width: `${Math.max(5, progress)}%` }}
        />
      </div>

      {/* Stage indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stages.map((st) => {
          const state = getStageStatus(st.key);
          const Icon = st.icon;

          let badgeColor = "border-slate-800 bg-slate-900/40 text-slate-500";
          let iconColor = "text-slate-500";

          if (state === "completed") {
            badgeColor = "border-emerald-800/50 bg-emerald-950/20 text-emerald-300";
            iconColor = "text-emerald-400";
          } else if (state === "active") {
            badgeColor = "border-cyan-500/50 bg-cyan-950/40 text-cyan-200 shadow-md shadow-cyan-500/10";
            iconColor = "text-cyan-400 animate-bounce";
          } else if (state === "failed") {
            badgeColor = "border-rose-800 bg-rose-950/40 text-rose-300";
            iconColor = "text-rose-400";
          }

          return (
            <div
              key={st.key}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${badgeColor}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
              <div className="truncate">
                <div>{st.label}</div>
                <div className="text-[10px] text-slate-500 font-mono capitalize">{state}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
