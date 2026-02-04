const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 180 },
    brand: { type: String, trim: true, maxlength: 120, default: "" },
    notes: { type: String, trim: true, maxlength: 600, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("Product", ProductSchema);
