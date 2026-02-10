import React, { useEffect, useMemo, useState } from "react";
import { createTransfer, listProducts, listTransfers, Product, Transfer } from "../api";
import { Link } from "react-router-dom";

const BRANCHES = ["Sucursal 1", "Sucursal 2", "Sucursal 3", "Sucursal 4", "Sucursal 5"];

export function TransferPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transfer form
  const [productId, setProductId] = useState("");
  const [fromBranch, setFromBranch] = useState(BRANCHES[0]);
  const [toBranch, setToBranch] = useState(BRANCHES[1]);
  const [quantity, setQuantity] = useState(1);
  const [lot, setLot] = useState("");
  const [diopters, setDiopters] = useState("");
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [note, setNote] = useState("");

  const load = async () => {
    setError(null);
    setBusy(true);
    try {
      const [p, t] = await Promise.all([listProducts(), listTransfers(300)]);
      setProducts(p.products);
      setTransfers(t.transfers);
      if (!productId && p.products.length > 0) setProductId(p.products[0]._id);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar transferencias");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(() => {
    return !!productId && fromBranch && toBranch && fromBranch !== toBranch && quantity > 0;
  }, [productId, fromBranch, toBranch, quantity]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromBranch === toBranch) {
      setError("Seleccioná sucursales distintas");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const payload: any = {
        productId,
        quantity,
        fromBranch,
        toBranch,
        lot,
        diopters,
        expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null,
        note,
      };
      await createTransfer(payload);
      setQuantity(1);
      setLot("");
      setDiopters("");
      setExpirationDate("");
      setNote("");
      await load();
    } catch (err: any) {
      setError(err?.message || "No se pudo registrar la transferencia");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
        <div>
          <h2 className="mb-0">Transferencia de stock</h2>
          <div className="small-muted">Traslados entre sucursales</div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link to="/stock" className="btn btn-outline-light">
            Volver a movimientos
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
              <div className="fw-semibold">Nueva transferencia</div>
              <div className="small-muted">Seleccioná producto, sucursales y cantidad</div>
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

              <div className="col-6 col-md-3">
                <label className="form-label">Desde</label>
                <select className="form-select" value={fromBranch} onChange={(e) => setFromBranch(e.target.value)}>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-3">
                <label className="form-label">Hacia</label>
                <select className="form-select" value={toBranch} onChange={(e) => setToBranch(e.target.value)}>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
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
                <button className="btn btn-emerald w-100" disabled={busy || !canSubmit}>
                  {busy ? "Guardando…" : "Registrar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div className="fw-semibold">Transferencias recientes</div>
            <div className="small-muted">{transfers.length}</div>
          </div>

          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Desde</th>
                  <th>Hacia</th>
                  <th className="text-end">Cant.</th>
                  <th>Lote</th>
                  <th>Dioptrías</th>
                  <th>Vencimiento</th>
                  <th>Usuario</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t._id}>
                    <td>{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="fw-semibold">{t.product?.name}</td>
                    <td>{t.fromBranch}</td>
                    <td>{t.toBranch}</td>
                    <td className="text-end">{t.quantity}</td>
                    <td>{t.lot || "-"}</td>
                    <td>{t.diopters || "-"}</td>
                    <td>{t.expirationDate ? new Date(t.expirationDate).toLocaleDateString() : "-"}</td>
                    <td>{t.performedBy?.name || "-"}</td>
                    <td>{t.note || "-"}</td>
                  </tr>
                ))}
                {transfers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center small-muted py-4">
                      Sin transferencias todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
