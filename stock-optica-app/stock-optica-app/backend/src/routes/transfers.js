const express = require("express");
const { body, validationResult } = require("express-validator");
const Transfer = require("../models/Transfer");
const Product = require("../models/Product");
const { requireAuth } = require("../middleware/auth");
const { BRANCHES } = require("../config/branches");

const router = express.Router();

const isValidBranch = (value) => BRANCHES.includes(value);

router.get("/", requireAuth(), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "200", 10), 1000);
  const transfers = await Transfer.find({})
    .populate("product", "name")
    .populate("performedBy", "name email role")
    .sort({ createdAt: -1 })
    .limit(limit);

  res.json({ transfers });
});

router.post(
  "/",
  requireAuth(),
  [
    body("productId").isString().isLength({ min: 10 }),
    body("quantity").isInt({ min: 1, max: 100000 }),
    body("fromBranch").isString().custom(isValidBranch),
    body("toBranch").isString().custom(isValidBranch),
    body("lot").optional().isString().isLength({ max: 80 }),
    body("diopters").optional().isString().isLength({ max: 40 }),
    body("expirationDate").optional({ nullable: true }).isISO8601().toDate(),
    body("note").optional().isString().isLength({ max: 600 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      productId,
      quantity,
      fromBranch,
      toBranch,
      lot = "",
      diopters = "",
      expirationDate = null,
      note = "",
    } = req.body;

    if (fromBranch === toBranch) return res.status(400).json({ message: "Las sucursales deben ser distintas" });

    const product = await Product.findById(productId);
    if (!product || !product.active) return res.status(400).json({ message: "Producto inválido" });

    const transfer = await Transfer.create({
      product: product._id,
      quantity: parseInt(quantity, 10),
      fromBranch,
      toBranch,
      lot: lot.trim(),
      diopters: diopters.trim(),
      expirationDate: expirationDate || null,
      performedBy: req.user._id,
      note: note.trim(),
    });

    const populated = await Transfer.findById(transfer._id)
      .populate("product", "name")
      .populate("performedBy", "name email role");

    res.status(201).json({ transfer: populated });
  }
);

module.exports = router;
