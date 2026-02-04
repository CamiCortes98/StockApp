const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth(), requireRole("admin"), async (req, res) => {
  const users = await User.find({}).select("-passwordHash").sort({ createdAt: -1 }).limit(500);
  res.json({ users });
});

router.post(
  "/",
  requireAuth(),
  requireRole("admin"),
  [
    body("name").isString().isLength({ min: 2, max: 120 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isString().isLength({ min: 8, max: 100 }),
    body("role").optional().isIn(["admin", "user"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role = "user" } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "El email ya está registrado" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role });
    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, active: user.active, createdAt: user.createdAt } });
  }
);

router.delete("/:id", requireAuth(), requireRole("admin"), async (req, res) => {
  if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: "No podés eliminar tu propio usuario" });

  const user = await User.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!user) return res.status(404).json({ message: "No encontrado" });
  res.json({ ok: true });
});

module.exports = router;
