const dotenv = require("dotenv");

dotenv.config();

const env = {
  port: Number(process.env.PORT) || Number(process.env.GATEWAY_PORT) || 8080,
  mode: process.env.DEV_MODE || process.env.NODE_ENV || "development",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  gatewayUrl: process.env.GATEWAY_URL || "http://localhost:8080",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://localhost:5672",
    exchange: process.env.RABBITMQ_EXCHANGE || "ecommerce.events",
  },
  serviceUrls: {
    products: process.env.PRODUCT_SERVICE_URL || "http://localhost:8081",
    cart: process.env.CART_SERVICE_URL || "http://localhost:8082",
    orders: process.env.ORDER_SERVICE_URL || "http://localhost:8083",
    payments: process.env.PAYMENT_SERVICE_URL || "http://localhost:8084",
    auth: process.env.AUTH_SERVICE_URL || "http://localhost:8085",
  },
  servicePorts: {
    products: Number(process.env.PRODUCT_SERVICE_PORT) || 8081,
    cart: Number(process.env.CART_SERVICE_PORT) || 8082,
    orders: Number(process.env.ORDER_SERVICE_PORT) || 8083,
    payments: Number(process.env.PAYMENT_SERVICE_PORT) || 8084,
    auth: Number(process.env.AUTH_SERVICE_PORT) || 8085,
  },
};

module.exports = { env };
