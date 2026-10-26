import React from "react";
import { FolderGit2, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "./Button.jsx";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = FolderGit2,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
      <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-4 text-cyan-400">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function CleanCodeState() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-emerald-900/30 rounded-xl bg-emerald-950/10">
      <div className="w-12 h-12 rounded-full bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center mb-4 text-emerald-400">
        <CheckCircle2 className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-emerald-200 mb-1">No Issues Detected</h3>
      <p className="text-sm text-slate-400 max-w-md">
        No findings were reported by the configured tools for this scan. This does not prove the code is issue-free, but all active deterministic checks passed.
      </p>
    </div>
  );
}
