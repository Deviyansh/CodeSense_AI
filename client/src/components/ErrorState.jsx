import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button.jsx";

export function ErrorState({ error, onRetry }) {
  const message = error?.message || "An unexpected error occurred while processing this request.";
  const code = error?.code || "INTERNAL_ERROR";
  const requestId = error?.requestId || null;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-rose-900/40 rounded-xl bg-rose-950/20 my-4">
      <div className="w-12 h-12 rounded-full bg-rose-900/40 border border-rose-700/50 flex items-center justify-center mb-4 text-rose-400">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-200 mb-1">Request Failed</h3>
      <p className="text-sm text-slate-300 max-w-md mb-2">{message}</p>
      
      <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-6">
        <span>Code: {code}</span>
        {requestId && <span>• ReqID: {requestId}</span>}
      </div>

      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm" icon={RefreshCw}>
          Retry Request
        </Button>
      )}
    </div>
  );
}
