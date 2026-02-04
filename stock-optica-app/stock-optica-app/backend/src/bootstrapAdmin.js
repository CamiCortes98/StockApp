const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function bootstrapAdmin() {
  const enabled = (process.env.BOOTSTRAP_ADMIN || "").toLowerCase() === "true";
  if (!enabled) return;

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME || "Administrador";

  if (!email || !password) {
    console.warn("[bootstrap] BOOTSTRAP_ADMIN está activo, pero faltan BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD");
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      await existing.save();
      console.log("[bootstrap] usuario existente promovido a admin:", email);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name, email, passwordHash, role: "admin" });
  console.log("[bootstrap] admin creado:", email);
}

module.exports = { bootstrapAdmin };
