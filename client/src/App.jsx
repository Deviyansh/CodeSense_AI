import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext.jsx";
import { Navbar } from "./components/Navbar.jsx";
import { AppRoutes } from "./routes/AppRoutes.jsx";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white">
          <Navbar />
          <main className="flex-1">
            <AppRoutes />
          </main>
          <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
            <p>CodeSense AI • Intelligent Code Review Platform • MERN + JavaScript</p>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
