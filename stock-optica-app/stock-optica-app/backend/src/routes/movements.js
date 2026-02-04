const express = require("express");
const { body, validationResult } = require("express-validator");
const Movement = require("../models/Movement");
const Product = require("../models/Product");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth(), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "200", 10), 1000);
  const movements = await Movement.find({})
    .populate("product", "name")
    .populate("performedBy", "name email role")
    .sort({ createdAt: -1 })
    .limit(limit);

  res.json({ movements });
});

router.post(
  "/",
  requireAuth(),
  [
    body("productId").isString().isLength({ min: 10 }),
    body("type").isIn(["IN", "OUT"]),
    body("quantity").isInt({ min: 1, max: 100000 }),
    body("lot").optional().isString().isLength({ max: 80 }),
    body("diopters").optional().isString().isLength({ max: 40 }),
    body("expirationDate").optional({ nullable: true }).isISO8601().toDate(),
    body("note").optional().isString().isLength({ max: 600 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { productId, type, quantity, lot = "", diopters = "", expirationDate = null, note = "" } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.active) return res.status(400).json({ message: "Producto inválido" });

    const movement = await Movement.create({
      product: product._id,
      type,
      quantity: parseInt(quantity, 10),
      lot: lot.trim(),
      diopters: diopters.trim(),
      expirationDate: expirationDate || null,
      performedBy: req.user._id,
      note: note.trim(),
    });

    const populated = await Movement.findById(movement._id).populate("product", "name").populate("performedBy", "name email role");
    res.status(201).json({ movement: populated });
  }
);

router.put(
  "/:id",
  requireAuth(),
  [
    body("type").optional().isIn(["IN", "OUT"]),
    body("quantity").optional().isInt({ min: 1, max: 100000 }),
    body("lot").optional().isString().isLength({ max: 80 }),
    body("diopters").optional().isString().isLength({ max: 40 }),
    body("expirationDate").optional({ nullable: true }).isISO8601().toDate(),
    body("note").optional().isString().isLength({ max: 600 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const movement = await Movement.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate("product", "name")
      .populate("performedBy", "name email role");

    if (!movement) return res.status(404).json({ message: "No encontrado" });
    res.json({ movement });
  }
);

router.delete("/:id", requireAuth(), async (req, res) => {
  const ok = await Movement.findByIdAndDelete(req.params.id);
  if (!ok) return res.status(404).json({ message: "No encontrado" });
  res.json({ ok: true });
});

router.post(
  "/bulk-delete",
  requireAuth(),
  [body("ids").isArray({ min: 1, max: 500 }), body("ids.*").isString().isLength({ min: 10 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { ids } = req.body;
    const result = await Movement.deleteMany({ _id: { $in: ids } });
    res.json({ deletedCount: result.deletedCount || 0 });
  }
);

module.exports = router;
