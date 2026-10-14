const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  name: String,
  description: String,
  price: Number,
  stock: Number,
  image: String,
});

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);