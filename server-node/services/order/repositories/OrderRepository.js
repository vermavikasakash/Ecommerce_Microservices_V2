let OrderModel;
try {
  OrderModel = require('../models/OrderModel');
} catch (err) {
  OrderModel = null;
}

class OrderRepository {
  constructor() {
    this.orders = [];
  }

  async create(order) {
    if (OrderModel && process.env.MONGODB_URI) {
      const created = await OrderModel.create(order);
      return created.toObject();
    }

    this.orders.unshift(order);
    return order;
  }

  async findByCustomerId(customerId) {
    if (OrderModel && process.env.MONGODB_URI) {
      return OrderModel.find({ customerId }).lean();
    }
    return this.orders.filter((order) => order.customerId === customerId);
  }

  async findByIdempotencyKey(customerId, idempotencyKey) {
    if (OrderModel && process.env.MONGODB_URI) {
      return OrderModel.findOne({ customerId, idempotencyKey }).lean();
    }

    return this.orders.find(
      (order) => order.customerId === customerId && order.idempotencyKey === idempotencyKey
    );
  }

  async update(id, customerId, updates) {
    if (OrderModel && process.env.MONGODB_URI) {
      const updated = await OrderModel.findOneAndUpdate(
        { id, customerId },
        { $set: updates },
        { new: true }
      ).lean();
      return updated;
    }

    const order = this.orders.find(
      (item) => item.id === id && item.customerId === customerId
    );
    if (!order) return null;

    Object.assign(order, updates);
    return order;
  }

  async confirm(id, customerId, updates) {
    if (OrderModel && process.env.MONGODB_URI) {
      const updated = await OrderModel.findOneAndUpdate(
        { id, customerId, status: { $in: ["pending_payment", "payment_captured"] } },
        { $set: updates },
        { new: true }
      ).lean();
      return updated;
    }

    const order = this.orders.find(
      (item) =>
        item.id === id &&
        item.customerId === customerId &&
        ["pending_payment", "payment_captured"].includes(item.status)
    );
    if (!order) return null;

    Object.assign(order, updates);
    return order;
  }
}

module.exports = { OrderRepository };
