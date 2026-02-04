import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { LoginPage } from "./pages/Login";
import { StockPage } from "./pages/Stock";
import { AdminPage } from "./pages/Admin";
import { AppNavbar } from "./components/AppNavbar";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container py-5 text-center"><div className="spinner-border text-light" role="status" /></div>;
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
          path="/stock"
          element={
            <Protected>
              <StockPage />
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
        <Route path="*" element={<Navigate to={user ? "/stock" : "/"} replace />} />
      </Routes>
    </>
  );
}
