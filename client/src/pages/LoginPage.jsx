import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, Mail, User, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "../features/auth/AuthContext.jsx";
import { Button } from "../components/Button.jsx";

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate("/");
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setName("Demo Engineer");
    setEmail("demo@codesense.ai");
    setPassword("DemoPassword123!");
    setIsRegister(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and headline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/25 mb-4 text-white">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            CodeSense <span className="text-gradient">AI</span>
          </h1 >
          <p className="text-sm text-slate-400">
            Intelligent Code Review & Security Remediation Platform
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-panel p-8 shadow-2xl relative">
          <div className="flex border-b border-slate-800 mb-6">
            <button
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${
                !isRegister
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${
                isRegister
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg border border-rose-900 bg-rose-950/40 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Alex Chen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="developer@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              {isRegister ? "Register & Enter Dashboard" : "Sign In"}
            </Button>
          </form>

          {/* Quick Demo Fill */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <button
              onClick={handleFillDemo}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autofill Demo Credentials</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
