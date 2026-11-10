import React from "react";

export function SeverityBadge({ severity }) {
  const s = (severity || "unknown").toLowerCase();

  const styles = {
    critical: {
      bg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      dot: "bg-rose-500",
      label: "CRITICAL",
    },
    high: {
      bg: "bg-orange-500/15 text-orange-300 border-orange-500/30",
      dot: "bg-orange-500",
      label: "HIGH",
    },
    medium: {
      bg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      dot: "bg-amber-500",
      label: "MEDIUM",
    },
    low: {
      bg: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      dot: "bg-sky-500",
      label: "LOW",
    },
    info: {
      bg: "bg-slate-500/15 text-slate-300 border-slate-500/30",
      dot: "bg-slate-400",
      label: "INFO",
    },
    unknown: {
      bg: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
      dot: "bg-zinc-400",
      label: "UNKNOWN",
    },
  };

  const current = styles[s] || styles.unknown;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wider border ${current.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const st = (status || "queued").toLowerCase();

  const styles = {
    queued: {
      bg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      dot: "bg-amber-400 animate-pulse",
      label: "Queued",
    },
    running: {
      bg: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      dot: "bg-sky-400 animate-spin",
      label: "Running",
    },
    completed: {
      bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      dot: "bg-emerald-400",
      label: "Completed",
    },
    failed: {
      bg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      dot: "bg-rose-500",
      label: "Failed",
    },
    cancelled: {
      bg: "bg-slate-500/15 text-slate-300 border-slate-500/30",
      dot: "bg-slate-400",
      label: "Cancelled",
    },
  };

  const current = styles[st] || styles.queued;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
}
