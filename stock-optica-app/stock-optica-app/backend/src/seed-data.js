// backend/seed-demo-data.js
require("dotenv").config();
const mongoose = require("mongoose");

const Product = require("./models/Product");
const Movement = require("./models/Movement");
const User = require("./models/User");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function maybe(prob = 0.5) {
  return Math.random() < prob;
}

function randomDateInLastDays(daysBack) {
  const now = new Date();
  const delta = randInt(0, daysBack) * 24 * 60 * 60 * 1000 + randInt(0, 86_400_000);
  return new Date(now.getTime() - delta);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Falta MONGODB_URI en .env");

  await mongoose.connect(uri);
  console.log("[seed] conectado");

  const admin = await User.findOne({ role: "admin", active: true }).sort({ createdAt: 1 });
  if (!admin) throw new Error("No hay usuario admin activo. Activá BOOTSTRAP_ADMIN o crealo desde /api/users.");

  // Productos base (óptica)
  const productsBase = [
    { name: "Lentes de contacto Blandos - Mensuales", brand: "Acuvue", notes: "Caja x 6" },
    { name: "Lentes de contacto Blandos - Diarios", brand: "Acuvue", notes: "Caja x 30" },
    { name: "Lentes de contacto Tóricos", brand: "Bausch + Lomb", notes: "Astigmatismo" },
    { name: "Lentes de contacto Multifocales", brand: "Alcon", notes: "Presbicia" },
    { name: "Solución multipropósito 360ml", brand: "Renu", notes: "" },
    { name: "Solución multipropósito 120ml", brand: "Opti-Free", notes: "" },
    { name: "Gotas lubricantes 15ml", brand: "Systane", notes: "Ojo seco" },
    { name: "Paño microfibra", brand: "Generic", notes: "Accesorio" },
    { name: "Estuche rígido", brand: "Generic", notes: "Accesorio" },
    { name: "Spray limpiador", brand: "Generic", notes: "Accesorio" },
    { name: "Armazón Metal", brand: "Ray-Ban", notes: "Adulto" },
    { name: "Armazón Acetato", brand: "Vulk", notes: "Adulto" },
    { name: "Armazón Niño", brand: "Mormaii", notes: "Infantil" },
    { name: "Clip-on polarizado", brand: "Generic", notes: "Accesorio" },
    { name: "Cordón sujeta lentes", brand: "Generic", notes: "Accesorio" },
    { name: "Limpieza ultrasónica (servicio)", brand: "Servicio", notes: "No vencimiento" },
    { name: "Cristales monofocales", brand: "Essilor", notes: "Laboratorio" },
    { name: "Cristales multifocales", brand: "Hoya", notes: "Laboratorio" },
    { name: "Antirreflejo premium", brand: "Essilor", notes: "Tratamiento" },
    { name: "Filtro luz azul", brand: "Hoya", notes: "Tratamiento" },
    { name: "Lente de sol polarizado", brand: "Ray-Ban", notes: "" },
    { name: "Kit reparación tornillos", brand: "Generic", notes: "" },
    { name: "Toallitas limpiadoras", brand: "Generic", notes: "Caja x 50" },
    { name: "Solución salina 500ml", brand: "Generic", notes: "" },
    { name: "Estuche para lentes de contacto", brand: "Generic", notes: "" },
  ];

  // upsert simple por name
  const existing = await Product.find({ name: { $in: productsBase.map((p) => p.name) } });
  const existingByName = new Map(existing.map((p) => [p.name, p]));

  const products = [];
  for (const p of productsBase) {
    const found = existingByName.get(p.name);
    if (found) products.push(found);
    else products.push(await Product.create({ ...p }));
  }

  const dioptersPool = [
    "-0.50", "-0.75", "-1.00", "-1.25", "-1.50", "-1.75", "-2.00", "-2.25", "-2.50", "-3.00",
    "+0.50", "+1.00", "+1.50", "+2.00",
  ];
  const lotPrefix = ["LC", "SOL", "ARM", "ACC", "LAB"];

  // generar 200 movimientos variados
  const docs = [];
  for (let i = 0; i < 200; i++) {
    const product = pick(products);

    // Servicios/lab: sin lote/diop/vto la mayoría
    const isService = /servicio|laboratorio|tratamiento/i.test(product.name);

    const type = maybe(0.58) ? "IN" : "OUT";
    const quantity = isService ? randInt(1, 8) : randInt(1, 25);

    const createdAt = randomDateInLastDays(180);

    const lot = isService ? "" : `${pick(lotPrefix)}-${randInt(1000, 9999)}-${pad2(randInt(1, 12))}`;
    const diopters = isService ? "" : (maybe(0.70) ? pick(dioptersPool) : "");
    const expirationDate =
      isService || maybe(0.35)
        ? null
        : new Date(createdAt.getTime() + randInt(60, 720) * 24 * 60 * 60 * 1000); // 2 a 24 meses aprox

    const note = type === "IN"
      ? pick(["Reposición proveedor", "Ingreso por compra", "Ajuste inventario", "Ingreso depósito"])
      : pick(["Venta mostrador", "Pedido cliente", "Salida por garantía", "Ajuste inventario"]);

    docs.push({
      product: product._id,
      type,
      quantity,
      lot,
      diopters,
      expirationDate,
      performedBy: admin._id,
      note,
      createdAt,
      updatedAt: createdAt,
    });
  }

  // Si querés que sea “idempotente”, podríamos borrar antes por rango de fechas/notas.
  // Por ahora: inserta y listo.
  const result = await Movement.insertMany(docs, { ordered: false });
  console.log(`[seed] insertados movimientos: ${result.length}`);

  await mongoose.disconnect();
  console.log("[seed] listo");
}

main().catch((e) => {
  console.error("[seed] error:", e);
  process.exit(1);
});
