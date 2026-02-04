import React, { useEffect, useMemo, useState } from "react";
import { createProduct, createUser, deactivateUser, deleteProduct, listMovements, listProducts, listUsers, Movement, Product } from "../api";
import { useAuth } from "../auth";
import { Link, useNavigate } from "react-router-dom";

export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create user form
  const [uName, setUName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPass, setUPass] = useState("");
  const [uRole, setURole] = useState<"admin" | "user">("user");

  // Create product form
  const [pName, setPName] = useState("");
  const [pBrand, setPBrand] = useState("");
  const [pNotes, setPNotes] = useState("");

  const canAccess = user?.role === "admin";

  const load = async () => {
    setError(null);
    setBusy(true);
    try {
      const [u, p, m] = await Promise.all([listUsers(), listProducts(), listMovements(150)]);
      setUsers(u.users);
      setProducts(p.products);
      setMovements(m.movements);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar administración");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  useEffect(() => {
    if (user && !canAccess) navigate("/stock");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canAccess]);

  const createNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await createUser({ name: uName, email: uEmail, password: uPass, role: uRole });
      setUName(""); setUEmail(""); setUPass(""); setURole("user");
      await load();
    } catch (err: any) {
      setError(err?.message || "No se pudo crear usuario");
    } finally {
      setBusy(false);
    }
  };

  const disableUser = async (id: string) => {
    setError(null);
    setBusy(true);
    try {
      await deactivateUser(id);
      await load();
    } catch (err: any) {
      setError(err?.message || "No se pudo desactivar");
    } finally {
      setBusy(false);
    }
  };

  const createNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await createProduct({ name: pName, brand: pBrand, notes: pNotes });
      setPName(""); setPBrand(""); setPNotes("");
      await load();
    } catch (err: any) {
      setError(err?.message || "No se pudo crear producto");
    } finally {
      setBusy(false);
    }
  };

  const removeProduct = async (id: string) => {
    setError(null);
    setBusy(true);
    try {
      await deleteProduct(id);
      await load();
    } catch (err: any) {
      setError(err?.message || "No se pudo eliminar producto");
    } finally {
      setBusy(false);
    }
  };

  const lastMovements = useMemo(() => movements.slice(0, 8), [movements]);

  if (!canAccess) return null;

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
        <div>
          <h2 className="mb-0">Administración</h2>
          <div className="small-muted">Usuarios · Movimientos · Productos</div>
        </div>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-light" to="/stock">Volver a movimientos</Link>
          <button className="btn btn-outline-light" onClick={load} disabled={busy}>{busy ? "Actualizando…" : "Actualizar"}</button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-4">
        {/* Users */}
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <div className="fw-semibold">Usuarios</div>
                  <div className="small-muted">Alta/Baja (desactivación)</div>
                </div>
                <div className="small-muted">{users.length}</div>
              </div>

              <form onSubmit={createNewUser} className="mb-3">
                <div className="row g-2">
                  <div className="col-12">
                    <input className="form-control" placeholder="Nombre" value={uName} onChange={(e) => setUName(e.target.value)} required />
                  </div>
                  <div className="col-12">
                    <input className="form-control" placeholder="Email" value={uEmail} onChange={(e) => setUEmail(e.target.value)} type="email" required />
                  </div>
                  <div className="col-8">
                    <input className="form-control" placeholder="Contraseña" value={uPass} onChange={(e) => setUPass(e.target.value)} type="password" minLength={8} required />
                  </div>
                  <div className="col-4">
                    <select className="form-select" value={uRole} onChange={(e) => setURole(e.target.value as any)}>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <button className="btn btn-emerald w-100" disabled={busy}>Crear usuario</button>
                  </div>
                </div>
              </form>

              <div className="table-responsive" style={{ maxHeight: 420, overflow: "auto" }}>
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Rol</th>
                      <th style={{ width: 90 }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <div className="fw-semibold">{u.name}</div>
                          <div className="small-muted">{u.email}</div>
                        </td>
                        <td>
                          <span className={`badge ${u.role === "admin" ? "text-bg-info" : "text-bg-secondary"}`}>{u.role}</span>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => disableUser(u._id)} disabled={busy || !u.active}>
                            {u.active ? "Baja" : "Off"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={3} className="text-center small-muted py-4">Sin usuarios</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Movements snapshot */}
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <div className="fw-semibold">Movimientos</div>
                  <div className="small-muted">Vista rápida</div>
                </div>
                <div className="small-muted">{movements.length}</div>
              </div>

              <div className="table-responsive" style={{ maxHeight: 520, overflow: "auto" }}>
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th className="text-end">Cant.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastMovements.map((m) => (
                      <tr key={m._id}>
                        <td className="small">{new Date(m.createdAt).toLocaleString()}</td>
                        <td>
                          <div className="fw-semibold">{m.product?.name}</div>
                          <div className="small-muted">{m.type} · Lote {m.lot || "-"}</div>
                        </td>
                        <td className="text-end">{m.quantity}</td>
                      </tr>
                    ))}
                    {movements.length === 0 && (
                      <tr><td colSpan={3} className="text-center small-muted py-4">Sin movimientos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>

        {/* Products */}
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <div className="fw-semibold">Productos</div>
                  <div className="small-muted">Alta</div>
                </div>
                <div className="small-muted">{products.length}</div>
              </div>

              <form onSubmit={createNewProduct} className="mb-3">
                <div className="row g-2">
                  <div className="col-12">
                    <input className="form-control" placeholder="Nombre del producto" value={pName} onChange={(e) => setPName(e.target.value)} required />
                  </div>
                  <div className="col-12">
                    <input className="form-control" placeholder="Marca" value={pBrand} onChange={(e) => setPBrand(e.target.value)} />
                  </div>
                  <div className="col-12">
                    <input className="form-control" placeholder="Notas" value={pNotes} onChange={(e) => setPNotes(e.target.value)} maxLength={600} />
                  </div>
                  <div className="col-12">
                    <button className="btn btn-emerald w-100" disabled={busy}>Crear producto</button>
                  </div>
                </div>
              </form>

              <div className="table-responsive" style={{ maxHeight: 420, overflow: "auto" }}>
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style={{ width: 90 }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <div className="fw-semibold">{p.name}</div>
                          <div className="small-muted">{p.brand || ""}</div>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => removeProduct(p._id)} disabled={busy}>
                            Baja
                          </button>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr><td colSpan={2} className="text-center small-muted py-4">Sin productos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

            
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
