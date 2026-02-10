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

router.post(
  "/bulk",
  requireAuth(),
  requireRole("admin"),
  [body("items").isArray({ min: 1, max: 500 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const rawItems = req.body.items || [];
    const cleaned = [];
    const invalid = [];
    const duplicates = [];
    const seen = new Set();

    rawItems.forEach((item, idx) => {
      const name = (item?.name || "").toString().trim();
      const brand = (item?.brand || "").toString().trim();
      const notes = (item?.notes || "").toString().trim();
      if (!name || name.length < 2) {
        invalid.push({ index: idx, name });
        return;
      }
      const key = name.toLowerCase();
      if (seen.has(key)) {
        duplicates.push({ index: idx, name });
        return;
      }
      seen.add(key);
      cleaned.push({ name, brand, notes, _key: key });
    });

    if (cleaned.length === 0) {
      return res.status(400).json({ message: "No hay productos válidos para crear" });
    }

    const names = cleaned.map((c) => c.name);
    const existing = await Product.find({ name: { $in: names } })
      .collation({ locale: "es", strength: 2 })
      .select("name");
    const existingSet = new Set(existing.map((p) => p.name.toLowerCase()));

    const toCreate = cleaned.filter((c) => !existingSet.has(c._key));
    const existingNames = cleaned.filter((c) => existingSet.has(c._key)).map((c) => c.name);

    let created = [];
    try {
      created = await Product.insertMany(
        toCreate.map(({ _key, ...rest }) => rest),
        { ordered: false }
      );
    } catch (err) {
      created = err?.insertedDocs || [];
    }

    res.status(201).json({
      createdCount: created.length,
      skippedCount: invalid.length + duplicates.length + existingNames.length,
      skipped: {
        invalid,
        duplicates,
        existing: existingNames,
      },
    });
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
