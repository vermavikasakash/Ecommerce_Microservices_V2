let CartModel;
try {
  CartModel = require('../models/CartModel');
} catch (err) {
  CartModel = null;
}

class CartRepository {
  constructor() {
    this.carts = new Map();
  }

  async findByCustomerId(customerId) {
    if (CartModel && process.env.MONGODB_URI) {
      const cart = await CartModel.findOne({ customerId }).lean();
      return cart || { customerId, items: [], total: 0 };
    }

    return this.carts.get(customerId) || { customerId, items: [], total: 0 };
  }

  async save(cart) {
    if (CartModel && process.env.MONGODB_URI) {
      const updated = await CartModel.findOneAndUpdate(
        { customerId: cart.customerId },
        { ...cart },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      return updated;
    }

    this.carts.set(cart.customerId, cart);
    return cart;
  }

  async clear(customerId) {
    if (CartModel && process.env.MONGODB_URI) {
      const cleared = await CartModel.findOneAndUpdate(
        { customerId },
        { items: [], total: 0 },
        { upsert: true, new: true }
      ).lean();
      return cleared;
    }

    const cart = { customerId, items: [], total: 0 };
    this.carts.set(customerId, cart);
    return cart;
  }
}

module.exports = { CartRepository };
