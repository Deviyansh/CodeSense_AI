import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { LoginPage } from "../pages/LoginPage.jsx";
import { DashboardPage } from "../pages/DashboardPage.jsx";
import { RepositoriesPage } from "../pages/RepositoriesPage.jsx";
import { ScanDetailPage } from "../pages/ScanDetailPage.jsx";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/repositories"
        element={
          <ProtectedRoute>
            <RepositoriesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scans/:id"
        element={
          <ProtectedRoute>
            <ScanDetailPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
