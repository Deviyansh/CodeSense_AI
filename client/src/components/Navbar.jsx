import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, GitBranch, LayoutDashboard, LogOut, Activity, User as UserIcon } from "lucide-react";
import { useAuth } from "../features/auth/AuthContext.jsx";
import { api } from "../lib/api.js";
import { Button } from "./Button.jsx";

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [healthy, setHealthy] = useState(true);

  useEffect(() => {
    async function checkHealth() {
      try {
        await api.health.check();
        setHealthy(true);
      } catch {
        setHealthy(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
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
            title={healthy ? "All services operational" : "API service degradation"}
          >
            <span className={`w-2 h-2 rounded-full ${healthy ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
            <span className="text-slate-400">{healthy ? "Engine Online" : "Degraded"}</span>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
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
                className="text-slate-400 hover:text-rose-400"
              >
                Sign out
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="primary" size="sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
