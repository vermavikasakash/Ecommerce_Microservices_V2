const mongoose = require("mongoose");

const PaymentTransactionSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  customerId: String,
  orderId: String,
  idempotencyKey: String,
  provider: String,
  amount: Number,
  currency: String,
  status: String,
  razorpayOrderId: String,
  providerOrder: Object,
  payment: Object,
  createdAt: String,
  capturedAt: String,
}, { timestamps: true });

PaymentTransactionSchema.index(
  { customerId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.models.PaymentTransaction ||
  mongoose.model("PaymentTransaction", PaymentTransactionSchema);
