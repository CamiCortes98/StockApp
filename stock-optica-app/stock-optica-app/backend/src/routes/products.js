const express = require("express");
const { body, validationResult } = require("express-validator");
const Product = require("../models/Product");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth(), async (req, res) => {
  const products = await Product.find({ active: true }).sort({ name: 1 });
  res.json({ products });
});

router.post(
  "/",
  requireAuth(),
  requireRole("admin"),
  [body("name").isString().isLength({ min: 2, max: 180 }), body("brand").optional().isString().isLength({ max: 120 }), body("notes").optional().isString().isLength({ max: 600 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, brand = "", notes = "" } = req.body;

    const exists = await Product.findOne({ name: name.trim() });
    if (exists) return res.status(409).json({ message: "Ya existe un producto con ese nombre" });

    const product = await Product.create({ name: name.trim(), brand: brand.trim(), notes: notes.trim() });
    res.status(201).json({ product });
  }
);

router.put(
  "/:id",
  requireAuth(),
  requireRole("admin"),
  [body("name").optional().isString().isLength({ min: 2, max: 180 }), body("brand").optional().isString().isLength({ max: 120 }), body("notes").optional().isString().isLength({ max: 600 }), body("active").optional().isBoolean()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: "No encontrado" });
    res.json({ product });
  }
);

router.delete("/:id", requireAuth(), requireRole("admin"), async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!product) return res.status(404).json({ message: "No encontrado" });
  res.json({ ok: true });
});

module.exports = router;
