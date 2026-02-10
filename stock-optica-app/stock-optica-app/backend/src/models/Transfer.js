const mongoose = require("mongoose");

const TransferSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    fromBranch: { type: String, required: true, trim: true, maxlength: 60, index: true },
    toBranch: { type: String, required: true, trim: true, maxlength: 60, index: true },
    lot: { type: String, trim: true, maxlength: 80, default: "" },
    diopters: { type: String, trim: true, maxlength: 40, default: "" },
    expirationDate: { type: Date, default: null, index: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    note: { type: String, trim: true, maxlength: 600, default: "" },
  },
  { timestamps: true }
);

TransferSchema.index({ product: 1, fromBranch: 1, toBranch: 1, lot: 1, diopters: 1, expirationDate: 1 });

module.exports = mongoose.model("Transfer", TransferSchema);
