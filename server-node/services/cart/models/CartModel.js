const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  productId: Number,
  name: String,
  price: Number,
  image: String,
  quantity: Number,
  lineTotal: Number,
}, { _id: false });

const CartSchema = new mongoose.Schema({
  customerId: { type: String, unique: true, index: true },
  items: [CartItemSchema],
  total: Number,
}, { timestamps: true });

module.exports = mongoose.models.Cart || mongoose.model('Cart', CartSchema);