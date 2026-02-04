import React, { useState } from "react";
import { login, register } from "../api";
import { useAuth } from "../auth";
import { useNavigate } from "react-router-dom";

type Mode = "login" | "register";

export function LoginPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = mode === "login" ? await login(email, password) : await register(name, email, password);
      setSession(res.token, res.user);
      navigate("/stock");
    } catch (err: any) {
      setError(err?.message || "No se pudo completar la operación");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: "8vh", paddingBottom: "8vh" }}>
      <div className="row justify-content-center">
        <div className="col-12 col-md-7 col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h3 className="mb-0">Stock Óptica</h3>
                  <div className="small-muted">Ingreso y registro</div>
                </div>
                {busy && (
                  <div className="d-flex align-items-center gap-2">
                    <div className="spinner-border spinner-border-sm text-light" role="status" />
                    <div className="small-muted">Validando…</div>
                  </div>
                )}
              </div>

              <div className="btn-group w-100 mb-3" role="group">
                <button className={`btn ${mode === "login" ? "btn-emerald" : "btn-outline-light"}`} onClick={() => setMode("login")} type="button">
                  Ingresar
                </button>
                <button className={`btn ${mode === "register" ? "btn-emerald" : "btn-outline-light"}`} onClick={() => setMode("register")} type="button">
                  Registrarme
                </button>
              </div>

              {error && <div className="alert alert-danger py-2">{error}</div>}

              <form onSubmit={submit}>
                {mode === "register" && (
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} />
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required type="email" maxLength={160} />
                </div>

                <div className="mb-3">
                  <label className="form-label">Contraseña</label>
                  <input className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required type="password" minLength={8} maxLength={100} />
                  <div className="form-text small-muted">Mínimo 8 caracteres.</div>
                </div>

                <button className="btn btn-emerald w-100" disabled={busy}>
                  {mode === "login" ? "Ingresar" : "Crear cuenta"}
                </button>
              </form>

              <hr className="hr-soft my-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
