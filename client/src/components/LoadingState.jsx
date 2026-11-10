import React from "react";
import { Loader2 } from "lucide-react";

export function LoadingState({ message = "Loading data..." }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
      <p className="text-sm text-slate-400 font-medium">{message}</p>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="w-full h-12 bg-slate-800/40 rounded-lg animate-pulse mb-3 border border-slate-800" />
  );
}
