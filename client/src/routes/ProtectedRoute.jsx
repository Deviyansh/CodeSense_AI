import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext.jsx";
import { LoadingState } from "../components/LoadingState.jsx";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingState message="Verifying authentication session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
