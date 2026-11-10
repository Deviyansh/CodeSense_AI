import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Activity,
  User as UserIcon,
  Settings,
  X,
  Lock,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../features/auth/AuthContext.jsx";
import { api } from "../lib/api.js";
import { Button } from "./Button.jsx";

export function Navbar() {
  const { user, logout, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [healthy, setHealthy] = useState(true);
  const [healthData, setHealthData] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [aiConsent, setAiConsent] = useState(user?.aiConsent || false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await api.health.check();
        setHealthy(true);
        setHealthData(res);
      } catch {
        setHealthy(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      setAiConsent(Boolean(user.aiConsent));
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleToggleConsent = async () => {
    try {
      setSavingSettings(true);
      const newConsent = !aiConsent;
      const res = await api.auth.updateSettings({ aiConsent: newConsent });
      setAiConsent(newConsent);
      if (updateUser && res?.user) {
        updateUser(res.user);
      }
    } catch (err) {
      alert("Failed to update AI consent settings: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const navLinks = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Repositories", href: "/repositories", icon: GitBranch },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                CodeSense <span className="text-cyan-400 font-extrabold text-sm px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800">AI</span>
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-slate-800/80 text-cyan-400 border border-slate-700/60"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right side status & user */}
        <div className="flex items-center gap-4">
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-slate-900 border border-slate-800"
            title={healthy ? `Engine Online (${healthData?.database || "ready"})` : "API service degradation"}
          >
            <span className={`w-2 h-2 rounded-full ${healthy ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
            <span className="text-slate-400">{healthy ? "Engine Online" : "Degraded"}</span>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
                title="Privacy & AI Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                <span className="text-[11px] text-slate-400">{user.email}</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                icon={LogOut}
                title="Sign out"
              >
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Settings & AI Privacy Consent Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Platform Privacy & AI Settings</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold text-sm text-slate-200">
                      External AI Code Inspection (Gemini)
                    </span>
                  </div>

                  <button
                    onClick={handleToggleConsent}
                    disabled={savingSettings}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      aiConsent ? "bg-cyan-500" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        aiConsent ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <p className="text-slate-400 leading-relaxed">
                  When enabled, sanitized code snippets of detected findings are sent to the Gemini API to generate contextual explanations and unified diff patches. Credentials and secrets are automatically redacted before transmission.
                </p>

                <p className="text-slate-400 leading-relaxed">
                  When disabled, CodeSense AI operates strictly with local deterministic analyzers and grounded rule templates without external AI calls.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/30 font-mono text-[11px] text-slate-400 space-y-1">
                <div className="text-slate-300 font-bold mb-1">Architecture Diagnostics</div>
                <div>Runtime Mode: {healthData?.database || "memory-mode"}</div>
                <div>Analyzers: ESLint 8.57, Semgrep 1.78, Gitleaks 8.18, OSV 1.4</div>
                <div>Server Uptime: {healthData?.uptimeSeconds || 0}s</div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowSettingsModal(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
