import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { listProducts, listMovements } from "../api";

interface Product {
  _id: string;
  name: string;
}

interface DashboardMetrics {
  avgUnits: number;
  topSales: Array<{ name: string; quantity: number }>;
  totalMovements: number;
  totalProducts: number;
  recentMovements: any[];
}

type Period = "day" | "week" | "month";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDayKey(d: Date) {
  // YYYY-MM-DD
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfWeek(d: Date) {
  // Semana ISO-like (lunes). Ajuste simple.
  const copy = new Date(d);
  const day = copy.getDay(); // 0 dom, 1 lun...
  const diff = (day === 0 ? -6 : 1) - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatWeekKey(d: Date) {
  const w = startOfWeek(d);
  return `${w.getFullYear()}-${pad2(w.getMonth() + 1)}-${pad2(w.getDate())}`;
}

function formatMonthKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function formatLabel(period: Period, key: string) {
  if (period === "day") {
    const [y, m, dd] = key.split("-");
    return `${dd}/${m}`;
  }
  if (period === "week") {
    const [y, m, dd] = key.split("-");
    return `Sem ${dd}/${m}`;
  }
  // month
  const [y, m] = key.split("-");
  return `${m}/${y}`;
}

export const Dashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // selector periodicidad
  const [period, setPeriod] = useState<Period>("day");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [prodsRes, movsRes] = await Promise.all([listProducts(), listMovements()]);
        setProducts(prodsRes.products);
        setMovements(movsRes.movements);
        setError(null);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setError("Error al cargar datos del dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const metrics = useMemo((): DashboardMetrics => {
    // Nota: acá estás sumando quantity sin distinguir IN/OUT.
    // Lo dejo igual para no cambiarte la semántica del KPI actual.
    const movementsByProduct: Record<string, number> = {};
    movements.forEach((mov) => {
      const prodId = mov.product?._id || mov.product;
      movementsByProduct[prodId] = (movementsByProduct[prodId] || 0) + mov.quantity;
    });

    const topSales = products
      .map((p) => ({ name: p.name, quantity: movementsByProduct[p._id] || 0 }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const totalMovements = movements.length;
    const totalProducts = products.length;
    const avgUnits =
      movements.length > 0 ? movements.reduce((sum, m) => sum + m.quantity, 0) / movements.length : 0;

    const recentMovements = movements.slice(0, 10);

    return { avgUnits, topSales, totalMovements, totalProducts, recentMovements };
  }, [products, movements]);

  /**
   * Time-series para gráfico de líneas:
   * - entradas: suma quantity donde type=IN
   * - salidas: suma quantity donde type=OUT
   * - neto: entradas - salidas
   */
  const timeSeries = useMemo(() => {
    const now = new Date();

    // ventana según period
    const windowDays = period === "day" ? 30 : period === "week" ? 16 * 7 : 18 * 31; // aprox
    const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const buckets: Record<
      string,
      { key: string; label: string; inQty: number; outQty: number; netQty: number }
    > = {};

    const getKey = (d: Date) => {
      if (period === "day") return formatDayKey(d);
      if (period === "week") return formatWeekKey(d);
      return formatMonthKey(d);
    };

    for (const mov of movements) {
      const createdAt = mov.createdAt ? new Date(mov.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) continue;
      if (createdAt < cutoff) continue;

      const key = getKey(createdAt);
      if (!buckets[key]) {
        buckets[key] = { key, label: formatLabel(period, key), inQty: 0, outQty: 0, netQty: 0 };
      }

      const qty = Number(mov.quantity) || 0;
      if (mov.type === "IN") buckets[key].inQty += qty;
      else if (mov.type === "OUT") buckets[key].outQty += qty;
    }

    // neto y orden cronológico
    const arr = Object.values(buckets)
      .map((b) => ({ ...b, netQty: b.inQty - b.outQty }))
      .sort((a, b) => (a.key < b.key ? -1 : 1));

    return arr;
  }, [movements, period]);

  if (loading) {
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
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Dashboard de Ventas</h1>

      {/* Métricas Principales */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total de Productos</h3>
          <p className="metric-value">{metrics.totalProducts}</p>
        </div>
        <div className="metric-card">
          <h3>Total de Movimientos</h3>
          <p className="metric-value">{metrics.totalMovements}</p>
        </div>
        <div className="metric-card">
          <h3>Promedio por Movimiento</h3>
          <p className="metric-value">{metrics.avgUnits.toFixed(1)}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-grid">
        {/* Time series (líneas) */}
        <div className="chart-container full-width">
          <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <h3 className="m-0">Evolución de unidades por período</h3>

            <div className="d-flex align-items-center gap-2">
              <span className="small-muted">Periodicidad</span>
              <select
                className="form-select"
                style={{ width: 180 }}
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
              >
                <option value="day">Diaria (últimos 30)</option>
                <option value="week">Semanal</option>
                <option value="month">Mensual</option>
              </select>
            </div>
          </div>

          <div style={{ height: 320, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                <XAxis dataKey="label" tickMargin={8} />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15,23,42,0.92)",
                    border: "1px solid rgba(148,163,184,0.25)",
                    borderRadius: "10px",
                    color: "#e2e8f0",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="inQty" name="Entradas" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="outQty" name="Salidas" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="netQty" name="Neto" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="small-muted" style={{ marginTop: 6 }}>
            * “Neto” = Entradas - Salidas, calculado a partir de `movements.createdAt` y `type`.
          </div>
        </div>

        {/* Ranking de Movimientos */}
        <div className="chart-container">
          <h3>Top 5 Productos por Movimientos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.topSales}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15,23,42,0.92)",
                  border: "1px solid rgba(148,163,184,0.25)",
                  borderRadius: "10px",
                  color: "#e2e8f0",
                }}
              />
              <Bar dataKey="quantity" fill="#38bdf8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Movimientos Recientes */}
        <div className="chart-container full-width">
          <h3>Últimos Movimientos</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="breaks-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Usuario</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentMovements.map((mov) => (
                  <tr key={mov._id}>
                    <td>{mov.product?.name || "N/A"}</td>
                    <td>
                      <span
                        style={{
                          color: mov.type === "IN" ? "#22c55e" : "#ef4444",
                          fontWeight: "600",
                        }}
                      >
                        {mov.type === "IN" ? "Entrada" : "Salida"}
                      </span>
                    </td>
                    <td>{mov.quantity}</td>
                    <td>{mov.performedBy?.name || "Sistema"}</td>
                    <td>{new Date(mov.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
