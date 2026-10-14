const crypto = require("crypto");
const { env } = require("../../shared/config/env");
const { makeServiceRequest } = require("../../shared/utils/makeServiceRequest");
const { publishRealtimeEvent } = require("../../shared/utils/realtimePublisher");

class OrderService {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
  }

  async listOrders(customerId) {
    return this.orderRepository.findByCustomerId(customerId);
  }

  async prepareOrder(customerId, checkout, idempotencyKey) {
    this.validateCustomerDetails(checkout);
    this.validateIdempotencyKey(idempotencyKey);

    const existing = await this.orderRepository.findByIdempotencyKey(
      customerId,
      idempotencyKey
    );
    if (existing) {
      if (existing.status === "confirmed") {
        return { order: existing, alreadyConfirmed: true };
      }

      if (["pending_payment", "payment_captured"].includes(existing.status)) {
        if (existing.paymentOrder) return this.toCheckoutResponse(existing);

        if (existing.status === "pending_payment" && existing.inventoryReservationId) {
          const paymentData = await this.createPaymentOrder(existing, idempotencyKey);
          const updatedOrder = await this.orderRepository.update(
            existing.id,
            customerId,
            {
              paymentTransactionId: paymentData.transaction.id,
              paymentOrder: paymentData.order,
            }
          );
          return this.toCheckoutResponse(updatedOrder || existing);
        }
      }

      const error = new Error("This checkout session cannot be reused");
      error.statusCode = 409;
      throw error;
    }

    const cartData = await this.getCart(customerId);
    const validatedCart = await this.validateCart(customerId, cartData.cart);
    const orderId = `ord_${crypto.randomUUID()}`;

    const pendingOrder = await this.orderRepository.create({
      id: orderId,
      customerId,
      customer: {
        firstName: checkout.firstName,
        lastName: checkout.lastName,
        address: checkout.address,
      },
      items: validatedCart.items,
      total: validatedCart.total,
      payment: null,
      paymentTransactionId: null,
      paymentOrder: null,
      inventoryReservationId: null,
      idempotencyKey,
      status: "pending_payment",
      createdAt: new Date().toISOString(),
    });

    let inventoryReserved = false;

    try {
      await this.reserveInventory(orderId, customerId, validatedCart.items);
      inventoryReserved = true;
      await this.orderRepository.update(orderId, customerId, {
        inventoryReservationId: orderId,
      });

      const paymentData = await this.createPaymentOrder(
        { id: orderId, customerId, total: validatedCart.total },
        idempotencyKey
      );

      const updatedOrder = await this.orderRepository.update(orderId, customerId, {
        paymentTransactionId: paymentData.transaction.id,
        paymentOrder: paymentData.order,
      });

      return this.toCheckoutResponse(updatedOrder || pendingOrder);
    } catch (error) {
      if (inventoryReserved) {
        try {
          await this.releaseInventory(orderId, customerId);
        } catch (releaseError) {
          console.error(
            `Inventory release failed for ${orderId}: ${releaseError.message}`
          );
        }
      }
      await this.orderRepository.update(orderId, customerId, {
        status: inventoryReserved ? "payment_setup_failed" : "inventory_unavailable",
      });
      throw error;
    }
  }

  async confirmOrder(customerId, checkout, idempotencyKey) {
    this.validateCustomerDetails(checkout);
    this.validatePaymentDetails(checkout);
    this.validateIdempotencyKey(idempotencyKey);

    const pendingOrder = await this.orderRepository.findByIdempotencyKey(
      customerId,
      idempotencyKey
    );
    if (!pendingOrder) {
      const error = new Error("Checkout session not found or expired");
      error.statusCode = 404;
      throw error;
    }

    if (pendingOrder.status === "confirmed") {
      await this.clearCart(customerId);
      return pendingOrder;
    }

    if (!["pending_payment", "payment_captured"].includes(pendingOrder.status)) {
      const error = new Error("Checkout session is not ready for confirmation");
      error.statusCode = 409;
      throw error;
    }

    let payment = pendingOrder.payment;
    if (pendingOrder.status === "pending_payment") {
      await this.ensureInventoryReservation(pendingOrder.inventoryReservationId, customerId);
      const cartData = await this.getCart(customerId);
      const validatedCart = await this.validateCart(customerId, cartData.cart, false);
      this.assertCartMatchesOrder(validatedCart, pendingOrder);

      const paymentData = await makeServiceRequest(
        env.serviceUrls.payments,
        "POST",
        "/api/payments/razorpay/verify",
        {
          ...checkout.razorpay,
          transactionId: pendingOrder.paymentTransactionId,
        },
        customerId,
        { "Idempotency-Key": idempotencyKey }
      );
      payment = paymentData.payment;

      await this.orderRepository.update(pendingOrder.id, customerId, {
        payment,
        status: "payment_captured",
      });
    }

    await this.commitInventory(pendingOrder.inventoryReservationId, customerId);

    const order = await this.orderRepository.confirm(
      pendingOrder.id,
      customerId,
      {
        payment,
        status: "confirmed",
        confirmedAt: new Date().toISOString(),
      }
    );

    if (!order) {
      return this.orderRepository.findByIdempotencyKey(customerId, idempotencyKey);
    }

    await this.clearCart(customerId);

    await publishRealtimeEvent("order.created", {
      customerId,
      order,
    });

    return order;
  }

  async cancelOrder(customerId, idempotencyKey) {
    this.validateIdempotencyKey(idempotencyKey);
    const order = await this.orderRepository.findByIdempotencyKey(
      customerId,
      idempotencyKey
    );

    if (!order) {
      const error = new Error("Checkout session not found or expired");
      error.statusCode = 404;
      throw error;
    }
    if (order.status === "confirmed") return order;
    if (order.status === "payment_captured") {
      const error = new Error("Captured payments cannot be cancelled here");
      error.statusCode = 409;
      throw error;
    }

    if (order.paymentTransactionId) {
      await makeServiceRequest(
        env.serviceUrls.payments,
        "POST",
        "/api/payments/razorpay/cancel",
        { transactionId: order.paymentTransactionId },
        customerId,
        { "Idempotency-Key": idempotencyKey }
      );
    }

    if (order.inventoryReservationId) {
      await this.releaseInventory(order.inventoryReservationId, customerId);
    }

    return this.orderRepository.update(order.id, customerId, {
      status: "cancelled",
    });
  }

  async getCart(customerId) {
    return makeServiceRequest(
      env.serviceUrls.cart,
      "GET",
      "/api/cart",
      null,
      customerId
    );
  }

  async validateCart(customerId, cart, requireStock = true) {
    if (!cart || !Array.isArray(cart.items) || !cart.items.length) {
      const error = new Error("At least one product is required");
      error.statusCode = 400;
      throw error;
    }

    const items = await Promise.all(
      cart.items.map(async (cartItem) => {
        const quantity = Number(cartItem.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) {
          const error = new Error("Cart contains an invalid quantity");
          error.statusCode = 400;
          throw error;
        }

        const productData = await makeServiceRequest(
          env.serviceUrls.products,
          "GET",
          `/api/products/${cartItem.productId}`,
          null,
          customerId
        );
        const product = productData.product;
        const stock = Number(product?.stock);

        if (!product || (requireStock && (!Number.isFinite(stock) || stock < quantity))) {
          const error = new Error(
            `Insufficient stock for ${product?.name || cartItem.name || "a product"}`
          );
          error.statusCode = 409;
          throw error;
        }

        const price = Number(product.price);
        return {
          productId: product.id,
          name: product.name,
          price,
          image: product.image,
          quantity,
          lineTotal: price * quantity,
        };
      })
    );

    return {
      items,
      total: items.reduce((sum, item) => sum + item.lineTotal, 0),
    };
  }

  async reserveInventory(reservationId, customerId, items) {
    const result = await makeServiceRequest(
      env.serviceUrls.products,
      "POST",
      "/api/products/reservations",
      {
        reservationId,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      customerId
    );
    return result.reservation;
  }

  async createPaymentOrder(order, idempotencyKey) {
    return makeServiceRequest(
      env.serviceUrls.payments,
      "POST",
      "/api/payments/razorpay/order",
      {
        amount: order.total,
        orderId: order.id,
        idempotencyKey,
      },
      order.customerId,
      { "Idempotency-Key": idempotencyKey }
    );
  }

  async releaseInventory(reservationId, customerId) {
    return makeServiceRequest(
      env.serviceUrls.products,
      "DELETE",
      `/api/products/reservations/${reservationId}`,
      null,
      customerId
    );
  }

  async commitInventory(reservationId, customerId) {
    return makeServiceRequest(
      env.serviceUrls.products,
      "POST",
      `/api/products/reservations/${reservationId}/commit`,
      null,
      customerId
    );
  }

  async ensureInventoryReservation(reservationId, customerId) {
    const result = await makeServiceRequest(
      env.serviceUrls.products,
      "GET",
      `/api/products/reservations/${reservationId}`,
      null,
      customerId
    );
    if (result.reservation.status !== "reserved") {
      const error = new Error("Inventory reservation has expired");
      error.statusCode = 409;
      throw error;
    }
  }

  async clearCart(customerId) {
    return makeServiceRequest(
      env.serviceUrls.cart,
      "DELETE",
      "/api/cart",
      null,
      customerId
    );
  }

  assertCartMatchesOrder(cart, order) {
    const sameItems =
      cart.items.length === order.items.length &&
      cart.items.every((item, index) => {
        const orderItem = order.items[index];
        return (
          item.productId === orderItem.productId &&
          item.quantity === orderItem.quantity &&
          item.price === orderItem.price
        );
      });

    if (!sameItems || cart.total !== order.total) {
      const error = new Error("Cart changed after checkout was prepared");
      error.statusCode = 409;
      throw error;
    }
  }

  toCheckoutResponse(order) {
    return {
      checkout: {
        orderId: order.id,
        transactionId: order.paymentTransactionId,
        idempotencyKey: order.idempotencyKey,
        amount: order.total,
        currency: "INR",
        paymentOrder: order.paymentOrder,
      },
    };
  }

  validateCustomerDetails(checkout = {}) {
    const requiredFields = ["firstName", "lastName", "address"];
    const missingField = requiredFields.find((field) => !checkout[field]);

    if (missingField) {
      const error = new Error(`${missingField} is required`);
      error.statusCode = 400;
      throw error;
    }
  }

  validatePaymentDetails(checkout = {}) {
    const razorpay = checkout.razorpay || {};
    const requiredFields = [
      "razorpay_order_id",
      "razorpay_payment_id",
      "razorpay_signature",
    ];
    const missingField = requiredFields.find((field) => !razorpay[field]);

    if (missingField) {
      const error = new Error(`${missingField} is required`);
      error.statusCode = 400;
      throw error;
    }
  }

  validateIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      const error = new Error("A valid Idempotency-Key header is required");
      error.statusCode = 400;
      throw error;
    }
  }
}

module.exports = { OrderService };
