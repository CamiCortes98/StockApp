const express = require("express");
const { requireAuth } = require("../middleware/auth");
const Movement = require("../models/Movement");

const router = express.Router();

/**
 * Stock actual = SUM(IN) - SUM(OUT) agrupado por:
 * product + lot + diopters + expirationDate
 * Solo devolvemos posiciones con qty > 0
 */
router.get("/", requireAuth(), async (req, res) => {
  const today = new Date();
  const soonDays = parseInt(req.query.soonDays || "30", 10);
  const soonCutoff = new Date(today.getTime() + soonDays * 24 * 60 * 60 * 1000);

  const positions = await Movement.aggregate([
    {
      $group: {
        _id: {
          product: "$product",
          lot: "$lot",
          diopters: "$diopters",
          expirationDate: "$expirationDate",
        },
        qtyIn: { $sum: { $cond: [{ $eq: ["$type", "IN"] }, "$quantity", 0] } },
        qtyOut: { $sum: { $cond: [{ $eq: ["$type", "OUT"] }, "$quantity", 0] } },
        lastMovementAt: { $max: "$createdAt" },
      },
    },
    {
      $addFields: {
        quantity: { $subtract: ["$qtyIn", "$qtyOut"] },
      },
    },
    { $match: { quantity: { $gt: 0 } } },
    { $sort: { lastMovementAt: -1 } },
    { $limit: 5000 },
    // Lookup product name
    {
      $lookup: {
        from: "products",
        localField: "_id.product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $project: {
        _id: 0,
        productId: "$product._id",
        productName: "$product.name",
        lot: "$_id.lot",
        diopters: "$_id.diopters",
        expirationDate: "$_id.expirationDate",
        quantity: 1,
        lastMovementAt: 1,
      },
    },
  ]);

  let totalQty = 0;
  let expiredQty = 0;
  let expiringSoonQty = 0;

  for (const p of positions) {
    totalQty += p.quantity;
    if (p.expirationDate) {
      const exp = new Date(p.expirationDate);
      if (exp < today) expiredQty += p.quantity;
      else if (exp <= soonCutoff) expiringSoonQty += p.quantity;
    }
  }

  res.json({
    totals: {
      totalQty,
      expiredQty,
      expiringSoonQty,
      soonDays,
    },
    positions,
  });
});

module.exports = router;
