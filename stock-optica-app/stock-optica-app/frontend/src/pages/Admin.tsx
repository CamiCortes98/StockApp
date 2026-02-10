import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { bulkCreateProducts, createProduct, createUser, deactivateUser, deleteProduct, listMovements, listProducts, listUsers, Movement, Product } from "../api";
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

  // Bulk product import
  const [importFileName, setImportFileName] = useState<string>("");
  const [importItems, setImportItems] = useState<{ name: string; brand?: string; notes?: string }[]>([]);
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

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

  const parseImportFile = async (file: File) => {
    setImportError(null);
    setImportInfo(null);
    setImportResult(null);
    setImportItems([]);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("Archivo vacío");
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as any[][];
      if (!rows || rows.length === 0) throw new Error("Archivo vacío");

      const header = (rows[0] || []).map((v: any) => v.toString().trim().toLowerCase());
      const nameKeys = ["nombre", "producto", "product", "name"];
      const brandKeys = ["marca", "brand"];
      const notesKeys = ["notas", "nota", "notes", "note"];

      const nameIdx = header.findIndex((h) => nameKeys.includes(h));
      const brandIdx = header.findIndex((h) => brandKeys.includes(h));
      const notesIdx = header.findIndex((h) => notesKeys.includes(h));
      const hasHeader = nameIdx >= 0 || brandIdx >= 0 || notesIdx >= 0;

      const start = hasHeader ? 1 : 0;
      const colName = hasHeader ? (nameIdx >= 0 ? nameIdx : 0) : 0;
      const colBrand = hasHeader ? (brandIdx >= 0 ? brandIdx : -1) : 1;
      const colNotes = hasHeader ? (notesIdx >= 0 ? notesIdx : -1) : 2;

      const items = rows.slice(start).map((row: any[]) => {
        const name = (row[colName] ?? "").toString().trim();
        const brand = colBrand >= 0 ? (row[colBrand] ?? "").toString().trim() : "";
        const notes = colNotes >= 0 ? (row[colNotes] ?? "").toString().trim() : "";
        return { name, brand, notes };
      });

      const cleaned = items.filter((i) => i.name);
      const limited = cleaned.slice(0, 500);
      setImportItems(limited);
      setImportFileName(file.name);
      if (cleaned.length === 0) {
        setImportInfo("No se encontraron productos válidos.");
      } else if (cleaned.length > 500) {
        setImportInfo(`Detectados ${cleaned.length} productos. Se importarán solo ${limited.length} (máx. 500).`);
      } else {
        setImportInfo(`Detectados ${cleaned.length} productos.`);
      }
    } catch (err: any) {
      setImportError(err?.message || "No se pudo leer el archivo");
    }
  };

  const runImport = async () => {
    if (importItems.length === 0) {
      setImportError("No hay productos para importar");
      return;
    }
    setImportError(null);
    setImportBusy(true);
    try {
      const res = await bulkCreateProducts(importItems);
      setImportResult(res);
      await load();
    } catch (err: any) {
      setImportError(err?.message || "No se pudo importar");
    } finally {
      setImportBusy(false);
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

              <hr className="hr-soft my-3" />

              <div className="mb-3">
                <div className="fw-semibold">Altas masivas</div>
                <div className="small-muted">Excel, CSV o TXT. Columnas: nombre, marca, notas.</div>
                <div className="row g-2 align-items-end mt-2">
                  <div className="col-12">
                    <input
                      className="form-control"
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) parseImportFile(file);
                      }}
                    />
                  </div>
                </div>

                {importFileName && <div className="small-muted mt-2">Archivo: {importFileName}</div>}
                {importInfo && <div className="small-muted mt-1">{importInfo}</div>}
                {importError && <div className="alert alert-danger py-2 mt-2">{importError}</div>}

                {importItems.length > 0 && (
                  <div className="d-flex align-items-center gap-2 mt-2">
                    <button className="btn btn-outline-light" onClick={runImport} disabled={importBusy}>
                      {importBusy ? "Importando…" : `Importar (${importItems.length})`}
                    </button>
                    <div className="small-muted">Máx. 500 por importación</div>
                  </div>
                )}

                {importResult && (
                  <div className="alert alert-success py-2 mt-2">
                    Creados: {importResult.createdCount} · Omitidos: {importResult.skippedCount}
                    <div className="small-muted mt-1">
                      Duplicados en archivo: {importResult.skipped?.duplicates?.length || 0} · Existentes: {importResult.skipped?.existing?.length || 0} · Inválidos: {importResult.skipped?.invalid?.length || 0}
                    </div>
                  </div>
                )}
              </div>

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
