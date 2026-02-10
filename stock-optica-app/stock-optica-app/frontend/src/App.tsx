import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { LoginPage } from "./pages/Login";
import { StockPage } from "./pages/Stock";
import { AdminPage } from "./pages/Admin";
import { Dashboard } from "./pages/Dashboard";
import { TransferPage } from "./pages/Transfer";
import { AppNavbar } from "./components/AppNavbar";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="page-loader">
        <div className="spinner" role="status" aria-label="Cargando">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();

  return (
    <>
      {user && <AppNavbar />}
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="/stock"
          element={
            <Protected>
              <StockPage />
            </Protected>
          }
        />
        <Route
          path="/transferencias"
          element={
            <Protected>
              <TransferPage />
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <Protected>
              <AdminPage />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
      </Routes>
    </>
  );
}
