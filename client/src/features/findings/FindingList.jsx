import React from "react";
import { SeverityBadge } from "../../components/Badge.jsx";
import { FileCode, Sparkles, ChevronRight, ShieldAlert } from "lucide-react";
import { CleanCodeState } from "../../components/EmptyState.jsx";

export function FindingList({ findings = [], onSelectFinding }) {
  if (findings.length === 0) {
    return <CleanCodeState />;
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase font-semibold tracking-wider">
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Finding / Rule</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Scanner</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {findings.map((finding) => (
              <tr
                key={finding._id || finding.fingerprint}
                onClick={() => onSelectFinding(finding._id)}
                className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
              >
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <SeverityBadge severity={finding.severity} />
                </td>

                <td className="py-3.5 px-4 max-w-md">
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors truncate">
                    {finding.title}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">
                    {finding.ruleId}
                  </div>
                </td>

                <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {finding.filePath}:{finding.startLine}
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                    {finding.category}
                  </span>
                </td>

                <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-400">
                  {finding.scanner}
                </td>

                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFinding(finding._id);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 group-hover:bg-cyan-950 text-slate-300 group-hover:text-cyan-300 border border-slate-700/60 group-hover:border-cyan-800 transition-all font-medium"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Review & Fix</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
