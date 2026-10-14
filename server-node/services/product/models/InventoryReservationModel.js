const mongoose = require("mongoose");

const ReservationItemSchema = new mongoose.Schema({
  productId: Number,
  quantity: Number,
}, { _id: false });

const InventoryReservationSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  customerId: String,
  items: [ReservationItemSchema],
  status: String,
  expiresAt: Date,
  createdAt: String,
  releasedAt: String,
  committedAt: String,
}, { timestamps: true });

InventoryReservationSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.models.InventoryReservation ||
  mongoose.model("InventoryReservation", InventoryReservationSchema);
