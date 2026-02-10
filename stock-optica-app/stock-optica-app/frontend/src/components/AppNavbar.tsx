import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import logo from "../logo.png";

export function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-semibold" to="/stock">
          <span className="badge badge-navy me-2">Óptica</span>
          <img className="brand-logo" src={logo} alt="Stock" />
        </Link>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="nav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <NavLink className="nav-link" to="/dashboard">
                Dashboard
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/stock">
                Movimientos
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/transferencias">
                Transferencias
              </NavLink>
            </li>
            {user?.role === "admin" && (
              <li className="nav-item">
                <NavLink className="nav-link" to="/admin">
                  Administración
                </NavLink>
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center gap-3">
            {user && (
              <div className="small-muted">
                <div className="fw-semibold">{user.name}</div>
                <div className="small">{user.email}</div>
              </div>
            )}
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
