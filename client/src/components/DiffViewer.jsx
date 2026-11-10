import React, { useState } from "react";
import { Check, Copy, Download, GitPullRequest } from "lucide-react";
import { Button } from "./Button.jsx";

export function DiffViewer({ diffText, filePath }) {
  const [copied, setCopied] = useState(false);

  if (!diffText) {
    return (
      <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 italic">
        No unified diff patch available for this finding.
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([diffText], { type: "text/x-diff" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patch-${(filePath || "fix").replace(/[\/\\]/g, "_")}.patch`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lines = diffText.split("\n");

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <GitPullRequest className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-medium text-slate-300">
            {filePath || "Unified Diff Patch"}
          </span>
          <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
            Proposed Fix
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            icon={copied ? Check : Copy}
            className="text-xs text-slate-300 hover:text-white"
          >
            {copied ? "Copied" : "Copy Diff"}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleDownload}
            icon={Download}
            className="text-xs"
          >
            Export .patch
          </Button>
        </div>
      </div>

      <div className="p-3 overflow-x-auto text-xs font-mono leading-relaxed select-text">
        {lines.map((line, idx) => {
          let lineClass = "text-slate-400";
          let bgClass = "transparent";

          if (line.startsWith("+") && !line.startsWith("+++")) {
            lineClass = "text-emerald-300 font-semibold";
            bgClass = "bg-emerald-950/40";
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            lineClass = "text-rose-300 font-semibold";
            bgClass = "bg-rose-950/40";
          } else if (line.startsWith("@@")) {
            lineClass = "text-cyan-400";
            bgClass = "bg-cyan-950/20";
          } else if (line.startsWith("---") || line.startsWith("+++")) {
            lineClass = "text-slate-500 font-bold";
          }

          return (
            <div
              key={idx}
              className={`px-2 py-0.5 rounded-sm whitespace-pre ${lineClass}`}
              style={{ backgroundColor: bgClass }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}
