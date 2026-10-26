import React from "react";
import { ShieldAlert, AlertTriangle, AlertCircle, Info, ShieldCheck } from "lucide-react";

export function ScanSummaryCard({ summary, scannerVersions = [] }) {
  const s = summary || { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  const cards = [
    { label: "Total Issues", count: s.total, color: "text-white", border: "border-slate-800", bg: "bg-slate-900/40" },
    { label: "Critical", count: s.critical, color: "text-rose-400", border: "border-rose-900/30", bg: "bg-rose-950/20" },
    { label: "High Risk", count: s.high, color: "text-orange-400", border: "border-orange-900/30", bg: "bg-orange-950/20" },
    { label: "Medium", count: s.medium, color: "text-amber-400", border: "border-amber-900/30", bg: "bg-amber-950/20" },
    { label: "Low & Info", count: (s.low || 0) + (s.info || 0), color: "text-cyan-400", border: "border-cyan-900/30", bg: "bg-cyan-950/20" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl border ${card.border} ${card.bg} backdrop-blur flex flex-col justify-between`}
          >
            <span className="text-xs text-slate-400 font-medium">{card.label}</span>
            <span className={`text-2xl font-bold font-mono tracking-tight mt-1 ${card.color}`}>
              {card.count}
            </span>
          </div>
        ))}
      </div>

      {scannerVersions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
          <span className="font-semibold text-slate-300">Scanner Provenance:</span>
          {scannerVersions.map((sv, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]"
            >
              {sv.scanner}@{sv.version}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
