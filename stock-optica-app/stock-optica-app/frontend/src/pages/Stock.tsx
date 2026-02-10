import React, { useEffect, useMemo, useState } from "react";
import { bulkDeleteMovements, createMovement, deleteMovement, getSummary, listMovements, listProducts, Movement, Product, SummaryPosition, updateMovement } from "../api";
import { Modal } from "../components/Modal";
import { Link } from "react-router-dom";

function isoToDateInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysUntil(dateIso?: string | null) {
  if (!dateIso) return null;
  const today = new Date();
  const d = new Date(dateIso);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  return diff;
}

const MOVEMENTS_PAGE_SIZE = 20;
const SUMMARY_PAGE_SIZE = 20;

export function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [summary, setSummary] = useState<{ totals: any; positions: SummaryPosition[] } | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New movement form
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState(1);
  const [lot, setLot] = useState("");
  const [diopters, setDiopters] = useState("");
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [note, setNote] = useState("");

  // Selection for bulk actions
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Edit modal
  const [edit, setEdit] = useState<Movement | null>(null);
  const [editShow, setEditShow] = useState(false);

  // Pagination
  const [movementsPage, setMovementsPage] = useState(1);
  const [summaryPage, setSummaryPage] = useState(1);
  const [movementQuery, setMovementQuery] = useState("");
  const summaryPositions = summary?.positions || [];

  const movementsFiltered = useMemo(() => {
    const q = movementQuery.trim().toLowerCase();
    if (!q) return movements;
    return movements.filter((m) => {
      const parts = [
        m.product?.name,
        m.type === "IN" ? "ingreso" : "egreso",
        m.type,
        m.lot,
        m.diopters,
        m.note,
        m.performedBy?.name,
        m.quantity?.toString(),
        m.createdAt,
        m.expirationDate,
      ];
      return parts.some((v) => (v || "").toString().toLowerCase().includes(q));
    });
  }, [movements, movementQuery]);

  const movementsTotalPages = useMemo(() => Math.max(1, Math.ceil(movementsFiltered.length / MOVEMENTS_PAGE_SIZE)), [movementsFiltered.length]);
  const summaryTotalPages = useMemo(() => Math.max(1, Math.ceil(summaryPositions.length / SUMMARY_PAGE_SIZE)), [summaryPositions.length]);

  const movementsPageItems = useMemo(() => {
    const start = (movementsPage - 1) * MOVEMENTS_PAGE_SIZE;
    return movementsFiltered.slice(start, start + MOVEMENTS_PAGE_SIZE);
  }, [movementsFiltered, movementsPage]);

  const summaryPageItems = useMemo(() => {
    const start = (summaryPage - 1) * SUMMARY_PAGE_SIZE;
    return summaryPositions.slice(start, start + SUMMARY_PAGE_SIZE);
  }, [summaryPositions, summaryPage]);

  useEffect(() => {
    setMovementsPage((p) => Math.min(p, movementsTotalPages));
  }, [movementsTotalPages]);

  useEffect(() => {
    setMovementsPage(1);
  }, [movementQuery]);

  useEffect(() => {
    setSummaryPage((p) => Math.min(p, summaryTotalPages));
  }, [summaryTotalPages]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);
  const allSelected = useMemo(
    () => movementsPageItems.length > 0 && movementsPageItems.every((m) => selected[m._id]),
    [movementsPageItems, selected]
  );

  const load = async () => {
    setError(null);
    setBusy(true);
    try {
      const [p, m, s] = await Promise.all([listProducts(), listMovements(300), getSummary(30)]);
      setProducts(p.products);
      setMovements(m.movements);
      setSummary(s);
      if (!productId && p.products.length > 0) setProductId(p.products[0]._id);
    } catch (err: any) {
      setError(err?.message || "Error al cargar datos");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload: any = {
        productId,
        type,
        quantity,
        lot,
        diopters,
        expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null,
        note,
      };
      await createMovement(payload);
      // reset minimal
      setQuantity(1);
      setLot("");
      setDiopters("");
      setExpirationDate("");
      setNote("");
      await load();
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar el movimiento");
    } finally {
      setBusy(false);
    }
  };

  const removeOne = async (id: string) => {
    setError(null);
    setBusy(true);
    try {
      await deleteMovement(id);
      await load();
    } catch (err: any) {
      setError(err?.message || "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      await bulkDeleteMovements(selectedIds);
      setSelected({});
      await load();
    } catch (err: any) {
      setError(err?.message || "No se pudo eliminar en bloque");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (m: Movement) => {
    setEdit(m);
    setEditShow(true);
  };

  const saveEdit = async () => {
    if (!edit) return;
    setError(null);
    setBusy(true);
    try {
      await updateMovement(edit._id, {
        type: edit.type,
        quantity: edit.quantity,
        lot: edit.lot || "",
        diopters: edit.diopters || "",
        expirationDate: edit.expirationDate ? new Date(edit.expirationDate).toISOString() : null,
        note: edit.note || "",
      });
      setEditShow(false);
      setEdit(null);
      await load();
    } catch (err: any) {
      setError(err?.message || "No se pudo actualizar");
    } finally {
      setBusy(false);
    }
  };

  const toggleAll = () => {
    if (movementsPageItems.length === 0) return;
    setSelected((prev) => {
      const to = !allSelected;
      const next = { ...prev };
      for (const m of movementsPageItems) next[m._id] = to;
      return next;
    });
  };

  const rowClassForExpiry = (iso?: string | null) => {
    const d = daysUntil(iso || null);
    if (d === null) return "";
    if (d < 0) return "table-danger";
    if (d <= 30) return "table-warning";
    return "";
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
        <div>
          <h2 className="mb-0">Movimientos de stock</h2>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link to="/admin" className="btn btn-outline-light">
            Administrar productos y usuarios
          </Link>
          <button className="btn btn-outline-light" onClick={load} disabled={busy}>
            {busy ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
            <div>
              <div className="fw-semibold">Nuevo movimiento</div>
              <div className="small-muted">Ingreso / Egreso. Si necesitás un nuevo producto, crealo en Administración.</div>
            </div>
            <div className="small-muted">
              <span className="me-2">Productos:</span>
              <span className="fw-semibold">{products.length}</span>
            </div>
          </div>

          <form onSubmit={create}>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label">Producto</label>
                <select className="form-select" value={productId} onChange={(e) => setProductId(e.target.value)} required>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option value="IN">Ingreso</option>
                  <option value="OUT">Egreso</option>
                </select>
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label">Cantidad</label>
                <input className="form-control" type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value || "1", 10))} />
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label">Lote</label>
                <input className="form-control" value={lot} onChange={(e) => setLot(e.target.value)} maxLength={80} />
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label">Dioptrías</label>
                <input className="form-control" value={diopters} onChange={(e) => setDiopters(e.target.value)} maxLength={40} placeholder="Ej: -1.25" />
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label">Vencimiento</label>
                <input className="form-control" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
              </div>

              <div className="col-12 col-md-7">
                <label className="form-label">Nota</label>
                <input className="form-control" value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} placeholder="Opcional" />
              </div>

              <div className="col-12 col-md-2 d-flex align-items-end">
                <button className="btn btn-emerald w-100" disabled={busy}>
                  {busy ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div>
              <div className="fw-semibold">Listado de movimientos</div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <input
                className="form-control form-control-sm"
                style={{ width: 220 }}
                placeholder="Buscar..."
                value={movementQuery}
                onChange={(e) => setMovementQuery(e.target.value)}
                aria-label="Buscar movimientos"
              />
              <button className="btn btn-sm btn-outline-light" onClick={toggleAll} disabled={movementsPageItems.length === 0}>
                {allSelected ? "Deseleccionar todo" : "Seleccionar todo"}
              </button>
              <button className="btn btn-sm btn-outline-danger" onClick={bulkDelete} disabled={selectedIds.length === 0 || busy}>
                Eliminar seleccionados ({selectedIds.length})
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th className="text-end">Cant.</th>
                  <th>Lote</th>
                  <th>Dioptrías</th>
                  <th>Vencimiento</th>
                  <th>Usuario</th>
                  <th style={{ width: 160 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {movementsPageItems.map((m) => (
                  <tr key={m._id} className={rowClassForExpiry(m.expirationDate || null)}>
                    <td>
                      <input type="checkbox" className="form-check-input" checked={!!selected[m._id]} onChange={(e) => setSelected((s) => ({ ...s, [m._id]: e.target.checked }))} />
                    </td>
                    <td>{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="fw-semibold">{m.product?.name}</td>
                    <td>
                      <span className={`badge ${m.type === "IN" ? "text-bg-success" : "text-bg-secondary"}`}>{m.type === "IN" ? "Ingreso" : "Egreso"}</span>
                    </td>
                    <td className="text-end">{m.quantity}</td>
                    <td>{m.lot || "-"}</td>
                    <td>{m.diopters || "-"}</td>
                    <td>
                      {m.expirationDate ? (
                        <>
                          {new Date(m.expirationDate).toLocaleDateString()}{" "}
                          <span className="small-muted">
                            {(() => {
                              const d = daysUntil(m.expirationDate);
                              if (d === null) return "";
                              if (d < 0) return `(vencido)`;
                              if (d <= 30) return `(<= 30 días)`;
                              return "";
                            })()}
                          </span>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{m.performedBy?.name || "-"}</td>
                    <td className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-light" onClick={() => openEdit(m)} disabled={busy}>
                        Editar
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => removeOne(m._id)} disabled={busy}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {movementsFiltered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center small-muted py-4">
                      {movements.length === 0 ? "Sin movimientos todavía." : "Sin resultados para la búsqueda."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="d-flex align-items-center justify-content-end gap-2 mt-2">
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => setMovementsPage((p) => Math.max(1, p - 1))}
              disabled={movementsPage <= 1}
            >
              {"<"}
            </button>
            <div className="small-muted">Pagina {movementsPage} de {movementsTotalPages}</div>
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => setMovementsPage((p) => Math.min(movementsTotalPages, p + 1))}
              disabled={movementsPage >= movementsTotalPages}
            >
              {">"}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div>
              <div className="fw-semibold">Resumen general del stock</div>
            </div>
            <div className="d-flex gap-3">
              <div>
                <div className="small-muted">Total</div>
                <div className="fw-semibold">{summary?.totals?.totalQty ?? "-"}</div>
              </div>
              <div>
                <div className="small-muted">Vencido</div>
                <div className="fw-semibold">{summary?.totals?.expiredQty ?? "-"}</div>
              </div>
              <div>
                <div className="small-muted">Próx. a vencer</div>
                <div className="fw-semibold">{summary?.totals?.expiringSoonQty ?? "-"}</div>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Lote</th>
                  <th>Dioptrías</th>
                  <th>Vencimiento</th>
                  <th className="text-end">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {summaryPageItems.map((p, idx) => (
                  <tr key={idx} className={rowClassForExpiry(p.expirationDate)}>
                    <td className="fw-semibold">{p.productName}</td>
                    <td>{p.lot || "-"}</td>
                    <td>{p.diopters || "-"}</td>
                    <td>{p.expirationDate ? new Date(p.expirationDate).toLocaleDateString() : "-"}</td>
                    <td className="text-end">{p.quantity}</td>
                  </tr>
                ))}
                {summaryPositions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center small-muted py-4">
                      Sin posiciones calculadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="d-flex align-items-center justify-content-end gap-2 mt-2">
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => setSummaryPage((p) => Math.max(1, p - 1))}
              disabled={summaryPage <= 1}
            >
              {"<"}
            </button>
            <div className="small-muted">Pagina {summaryPage} de {summaryTotalPages}</div>
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => setSummaryPage((p) => Math.min(summaryTotalPages, p + 1))}
              disabled={summaryPage >= summaryTotalPages}
            >
              {">"}
            </button>
          </div>
        </div>
      </div>

      <Modal
        title="Editar movimiento"
        show={editShow}
        onClose={() => {
          setEditShow(false);
          setEdit(null);
        }}
        footer={
          <>
            <button className="btn btn-outline-light" onClick={() => { setEditShow(false); setEdit(null); }} disabled={busy}>
              Cancelar
            </button>
            <button className="btn btn-emerald" onClick={saveEdit} disabled={busy}>
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
          </>
        }
      >
        {!edit ? (
          <div className="small-muted">Cargando…</div>
        ) : (
          <div className="row g-3">
            <div className="col-12">
              <div className="small-muted">Producto</div>
              <div className="fw-semibold">{edit.product?.name}</div>
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as any })}>
                <option value="IN">Ingreso</option>
                <option value="OUT">Egreso</option>
              </select>
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label">Cantidad</label>
              <input className="form-control" type="number" min={1} value={edit.quantity} onChange={(e) => setEdit({ ...edit, quantity: parseInt(e.target.value || "1", 10) })} />
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label">Lote</label>
              <input className="form-control" value={edit.lot || ""} onChange={(e) => setEdit({ ...edit, lot: e.target.value })} />
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label">Dioptrías</label>
              <input className="form-control" value={edit.diopters || ""} onChange={(e) => setEdit({ ...edit, diopters: e.target.value })} />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Vencimiento</label>
              <input className="form-control" type="date" value={isoToDateInput(edit.expirationDate || null)} onChange={(e) => setEdit({ ...edit, expirationDate: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>

            <div className="col-12 col-md-8">
              <label className="form-label">Nota</label>
              <input className="form-control" value={edit.note || ""} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
