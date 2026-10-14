const crypto = require("crypto");
const express = require("express");
const { asyncHandler } = require("../../shared/utils/asyncHandler");
const { publishRealtimeEvent } = require("../../shared/utils/realtimePublisher");
const { PaymentTransactionRepository } = require("../repositories/PaymentTransactionRepository");
const Razorpay = require("razorpay");

const paymentRouter = express.Router();
const transactionRepository = new PaymentTransactionRepository();

const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const getRazorpayClient = () => {
  if (!isRazorpayConfigured()) {
    const error = new Error("Razorpay is not configured");
    error.statusCode = 500;
    throw error;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const getCustomerId = (req) =>
  req.customerId || req.header("x-customer-id") || "guest-customer";

const getIdempotencyKey = (req) =>
  req.header("idempotency-key") || req.body.idempotencyKey;

const toPublicTransaction = (transaction) => ({
  id: transaction.id,
  orderId: transaction.orderId,
  amount: transaction.amount,
  currency: transaction.currency,
  status: transaction.status,
  razorpayOrderId: transaction.razorpayOrderId,
  payment: transaction.payment,
});

paymentRouter.get("/provider", (req, res) => {
  res.status(200).send({
    success: true,
    provider: "razorpay",
    configured: isRazorpayConfigured(),
    message: process.env.RAZORPAY_KEY_ID
      ? "Razorpay enabled"
      : "Razorpay key id is not configured",
    keyId: process.env.RAZORPAY_KEY_ID || null,
  });
});

paymentRouter.get("/razorpay/key", (req, res) => {
  if (!process.env.RAZORPAY_KEY_ID) {
    return res.status(500).send({
      success: false,
      message: "Razorpay key id is not configured",
    });
  }

  return res.status(200).send({
    success: true,
    key: process.env.RAZORPAY_KEY_ID,
  });
});

paymentRouter.post(
  "/razorpay/order",
  asyncHandler(async (req, res) => {
    const amount = Number(req.body.amount);
    const customerId = getCustomerId(req);
    const idempotencyKey = getIdempotencyKey(req);

    if (!idempotencyKey) {
      return res.status(400).send({
        success: false,
        message: "Idempotency-Key header is required",
      });
    }

    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).send({
        success: false,
        message: "Amount must be at least INR 1",
      });
    }

    const existing = await transactionRepository.findByIdempotencyKey(
      customerId,
      idempotencyKey
    );
    if (existing) {
      if (existing.status === "cancelled") {
        return res.status(409).send({
          success: false,
          message: "Payment transaction has been cancelled",
        });
      }

      if (existing.amount !== amount) {
        return res.status(409).send({
          success: false,
          message: "Idempotency key was already used with a different amount",
        });
      }

      return res.status(200).send({
        success: true,
        idempotent: true,
        transaction: toPublicTransaction(existing),
        order: existing.providerOrder,
      });
    }

    const razor = getRazorpayClient();
    const order = await razor.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    const transaction = await transactionRepository.create({
      id: `txn_${crypto.randomUUID()}`,
      customerId,
      orderId: req.body.orderId || null,
      idempotencyKey,
      provider: "razorpay",
      amount,
      currency: "INR",
      status: "created",
      razorpayOrderId: order.id,
      providerOrder: order,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).send({
      success: true,
      transaction: toPublicTransaction(transaction),
      order,
    });
  })
);

paymentRouter.post("/razorpay/cancel", asyncHandler(async (req, res) => {
  const { transactionId } = req.body;
  const transaction = await transactionRepository.findById(transactionId);

  if (!transaction) {
    return res.status(404).send({
      success: false,
      message: "Payment transaction not found",
    });
  }

  if (transaction.customerId !== getCustomerId(req)) {
    return res.status(403).send({
      success: false,
      message: "Payment transaction does not belong to this customer",
    });
  }

  if (transaction.status === "captured") {
    return res.status(409).send({
      success: false,
      message: "Captured payments cannot be cancelled",
    });
  }

  const cancelled = await transactionRepository.markCancelled(transaction.id);
  return res.status(200).send({
    success: true,
    transaction: toPublicTransaction(cancelled || transaction),
  });
}));

paymentRouter.post("/razorpay/verify", asyncHandler(async (req, res) => {
  const {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
    transactionId,
  } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({
      success: false,
      message: "Missing payment verification fields",
    });
  }

  const transaction = transactionId
    ? await transactionRepository.findById(transactionId)
    : await transactionRepository.findByRazorpayOrderId(razorpayOrderId);

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Payment transaction not found",
    });
  }

  if (transaction.customerId !== getCustomerId(req)) {
    return res.status(403).json({
      success: false,
      message: "Payment transaction does not belong to this customer",
    });
  }

  if (transaction.razorpayOrderId !== razorpayOrderId) {
    return res.status(400).json({
      success: false,
      message: "Payment order does not match the transaction",
    });
  }

  if (transaction.status === "captured") {
    return res.status(200).json({
      success: true,
      verified: true,
      idempotent: true,
      transaction: toPublicTransaction(transaction),
      payment: transaction.payment,
    });
  }

  if (transaction.status === "cancelled") {
    return res.status(409).json({
      success: false,
      message: "Payment transaction has been cancelled",
    });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    return res.status(400).json({
      success: false,
      verified: false,
      message: "Invalid payment signature",
    });
  }

  const razor = getRazorpayClient();
  const razorpayOrder = await razor.orders.fetch(razorpayOrderId);
  const expectedAmount = Math.round(transaction.amount * 100);

  if (razorpayOrder.amount !== expectedAmount) {
    return res.status(400).json({
      success: false,
      verified: false,
      message: "Payment amount does not match the transaction amount",
    });
  }

  const payment = {
    provider: "razorpay",
    paymentId: razorpayPaymentId,
    razorpayOrderId,
    status: "captured",
    amount: transaction.amount,
    method: "razorpay",
  };
  const capturedTransaction = await transactionRepository.markCaptured(
    transaction.id,
    payment
  );

  if (capturedTransaction) {
    await publishRealtimeEvent("payment.completed", {
      customerId: transaction.customerId,
      transaction: toPublicTransaction(capturedTransaction),
      payment,
    });
  }

  return res.json({
    success: true,
    verified: true,
    transaction: toPublicTransaction(capturedTransaction || transaction),
    payment,
  });
}));

module.exports = { paymentRouter };
