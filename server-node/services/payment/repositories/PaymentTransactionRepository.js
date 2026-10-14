let PaymentTransactionModel;
try {
  PaymentTransactionModel = require("../models/PaymentTransactionModel");
} catch (err) {
  PaymentTransactionModel = null;
}

class PaymentTransactionRepository {
  constructor() {
    this.transactions = [];
  }

  async create(transaction) {
    if (PaymentTransactionModel && process.env.MONGODB_URI) {
      const created = await PaymentTransactionModel.create(transaction);
      return created.toObject();
    }

    this.transactions.unshift(transaction);
    return transaction;
  }

  async findById(id) {
    if (PaymentTransactionModel && process.env.MONGODB_URI) {
      return PaymentTransactionModel.findOne({ id }).lean();
    }
    return this.transactions.find((transaction) => transaction.id === id);
  }

  async findByIdempotencyKey(customerId, idempotencyKey) {
    if (PaymentTransactionModel && process.env.MONGODB_URI) {
      return PaymentTransactionModel.findOne({ customerId, idempotencyKey }).lean();
    }
    return this.transactions.find(
      (transaction) =>
        transaction.customerId === customerId &&
        transaction.idempotencyKey === idempotencyKey
    );
  }

  async findByRazorpayOrderId(razorpayOrderId) {
    if (PaymentTransactionModel && process.env.MONGODB_URI) {
      return PaymentTransactionModel.findOne({ razorpayOrderId }).lean();
    }
    return this.transactions.find(
      (transaction) => transaction.razorpayOrderId === razorpayOrderId
    );
  }

  async markCaptured(id, payment) {
    if (PaymentTransactionModel && process.env.MONGODB_URI) {
      const updated = await PaymentTransactionModel.findOneAndUpdate(
        { id, status: { $ne: "captured" } },
        {
          $set: {
            payment,
            status: "captured",
            capturedAt: new Date().toISOString(),
          },
        },
        { new: true }
      ).lean();
      return updated;
    }

    const transaction = this.transactions.find((item) => item.id === id);
    if (!transaction || transaction.status === "captured") return null;

    Object.assign(transaction, {
      payment,
      status: "captured",
      capturedAt: new Date().toISOString(),
    });
    return transaction;
  }

  async markCancelled(id) {
    if (PaymentTransactionModel && process.env.MONGODB_URI) {
      return PaymentTransactionModel.findOneAndUpdate(
        { id, status: "created" },
        { $set: { status: "cancelled" } },
        { new: true }
      ).lean();
    }

    const transaction = this.transactions.find((item) => item.id === id);
    if (!transaction || transaction.status !== "created") return null;

    transaction.status = "cancelled";
    return transaction;
  }
}

module.exports = { PaymentTransactionRepository };
