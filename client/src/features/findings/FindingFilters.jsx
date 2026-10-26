import React from "react";
import { Search, Filter, X } from "lucide-react";

export function FindingFilters({ filters, onChange, onReset }) {
  const severities = ["critical", "high", "medium", "low", "info"];
  const categories = ["security", "secrets", "dependencies", "correctness", "quality"];

  const hasActiveFilters = Boolean(filters.severity || filters.category || filters.search);

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search rule, message, or file path..."
          value={filters.search || ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Dropdown Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Severity */}
        <select
          value={filters.severity || ""}
          onChange={(e) => onChange({ ...filters, severity: e.target.value || undefined })}
          className="px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500 font-medium"
        >
          <option value="">All Severities</option>
          {severities.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.toUpperCase()}
            </option>
          ))}
        </select>

        {/* Category */}
        <select
          value={filters.category || ""}
          onChange={(e) => onChange({ ...filters, category: e.target.value || undefined })}
          className="px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500 font-medium"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c} className="capitalize">
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded bg-rose-950/30 border border-rose-900/50"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
