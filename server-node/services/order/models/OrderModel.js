const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId: Number,
  name: String,
  price: Number,
  image: String,
  quantity: Number,
  lineTotal: Number,
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  customerId: String,
  customer: Object,
  items: [OrderItemSchema],
  total: Number,
  payment: Object,
  paymentTransactionId: String,
  paymentOrder: Object,
  inventoryReservationId: String,
  idempotencyKey: String,
  status: String,
  createdAt: String,
  confirmedAt: String,
}, { timestamps: true });

OrderSchema.index(
  { customerId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);
