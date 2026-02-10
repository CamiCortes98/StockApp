require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { connectDb } = require("./config/db");
const { bootstrapAdmin } = require("./bootstrapAdmin");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const movementRoutes = require("./routes/movements");
const userRoutes = require("./routes/users");
const summaryRoutes = require("./routes/summary");
const transferRoutes = require("./routes/transfers");

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

if (!MONGODB_URI) {
  console.error("Falta MONGODB_URI en .env");
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error("Falta JWT_SECRET en .env");
  process.exit(1);
}

async function main() {
  await connectDb(MONGODB_URI);
  await bootstrapAdmin();

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: CORS_ORIGIN, credentials: false }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/api/health", (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/movements", movementRoutes);
  app.use("/api/transfers", transferRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/summary", summaryRoutes);

  app.use((err, req, res, next) => {
    console.error("[error]", err);
    res.status(500).json({ message: "Error interno" });
  });

  app.listen(PORT, () => console.log(`[api] listening on :${PORT}`));
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
