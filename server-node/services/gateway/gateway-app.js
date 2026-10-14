const { env } = require("../shared/config/env");
const { authenticate } = require("../shared/middleware/authContext");
const { makeServiceRequest } = require("../shared/utils/makeServiceRequest");
const { asyncHandler } = require("../shared/utils/asyncHandler");
const { createServiceApp } = require("../shared/utils/createServiceApp");

const getIdempotencyHeaders = (req) => ({
  "Idempotency-Key": req.header("idempotency-key"),
});

const registerGatewayRoutes = (app) => {
  // Gateway endpoints
  app.get("/", (req, res) => {
    res.send("<h1>E-commerce API Gateway is running</h1>");
  });

  // Auth routes
  app.post("/api/auth/signup", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.auth,
      "POST",
      "/api/auth/signup",
      req.body
    );
    res.status(201).send(data);
  }));

  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.auth,
      "POST",
      "/api/auth/login",
      req.body
    );
    res.status(200).send(data);
  }));

  // Route products requests to Product Service
  app.get("/api/products", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.products,
      "GET",
      "/api/products",
      null,
      req.customerId
    );
    res.status(200).send(data);
  }));

  app.get("/api/products/:productId", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.products,
      "GET",
      `/api/products/${req.params.productId}`,
      null,
      req.customerId
    );
    res.status(200).send(data);
  }));

  app.use(["/api/cart", "/api/orders", "/api/payments"], authenticate);

  // Route cart requests to Cart Service
  app.get("/api/cart", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.cart,
      "GET",
      "/api/cart",
      null,
      req.customerId
    );
    res.status(200).send(data);
  }));

  app.post("/api/cart/items", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.cart,
      "POST",
      "/api/cart/items",
      req.body,
      req.customerId
    );
    res.status(201).send(data);
  }));

  app.patch("/api/cart/items/:productId", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.cart,
      "PATCH",
      `/api/cart/items/${req.params.productId}`,
      req.body,
      req.customerId
    );
    res.status(200).send(data);
  }));

  app.delete("/api/cart/items/:productId", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.cart,
      "DELETE",
      `/api/cart/items/${req.params.productId}`,
      null,
      req.customerId
    );
    res.status(200).send(data);
  }));

  app.delete("/api/cart", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.cart,
      "DELETE",
      "/api/cart",
      null,
      req.customerId
    );
    res.status(200).send(data);
  }));

  // Route orders requests to Order Service
  app.get("/api/orders", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.orders,
      "GET",
      "/api/orders",
      null,
      req.customerId
    );
    res.status(200).send(data);
  }));

  app.post("/api/orders/prepare", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.orders,
      "POST",
      "/api/orders/prepare",
      req.body,
      req.customerId,
      getIdempotencyHeaders(req)
    );
    res.status(data.alreadyConfirmed ? 200 : 201).send(data);
  }));

  app.post("/api/orders", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.orders,
      "POST",
      "/api/orders",
      req.body,
      req.customerId,
      getIdempotencyHeaders(req)
    );
    res.status(201).send(data);
  }));

  app.post("/api/orders/confirm", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.orders,
      "POST",
      "/api/orders/confirm",
      req.body,
      req.customerId,
      getIdempotencyHeaders(req)
    );
    res.status(201).send(data);
  }));

  app.post("/api/orders/cancel", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.orders,
      "POST",
      "/api/orders/cancel",
      null,
      req.customerId,
      getIdempotencyHeaders(req)
    );
    res.status(200).send(data);
  }));

  // Route payments requests to Payment Service
  app.get("/api/payments/provider", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.payments,
      "GET",
      "/api/payments/provider",
      null,
      req.customerId
    );
    res.status(200).send(data);
  }));

  app.get("/api/payments/razorpay/key", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.payments,
      "GET",
      "/api/payments/razorpay/key",
      null,
      req.customerId
    );
    res.status(200).send(data);
  }));

  app.post("/api/payments/razorpay/order", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.payments,
      "POST",
      "/api/payments/razorpay/order",
      req.body,
      req.customerId
    );
    res.status(201).send(data);
  }));

  app.post("/api/payments/razorpay/verify", asyncHandler(async (req, res) => {
    const data = await makeServiceRequest(
      env.serviceUrls.payments,
      "POST",
      "/api/payments/razorpay/verify",
      req.body,
      req.customerId
    );
    res.status(200).send(data);
  }));
};

const createApp = () =>
  createServiceApp({
    serviceName: "API Gateway",
    registerRoutes: registerGatewayRoutes,
  });

module.exports = { createApp };
