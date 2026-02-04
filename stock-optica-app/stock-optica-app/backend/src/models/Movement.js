const mongoose = require("mongoose");

const MovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    type: { type: String, enum: ["IN", "OUT"], required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    lot: { type: String, trim: true, maxlength: 80, default: "" },
    diopters: { type: String, trim: true, maxlength: 40, default: "" },
    expirationDate: { type: Date, default: null, index: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    note: { type: String, trim: true, maxlength: 600, default: "" },
  },
  { timestamps: true }
);

MovementSchema.index({ product: 1, lot: 1, diopters: 1, expirationDate: 1 });

module.exports = mongoose.model("Movement", MovementSchema);
