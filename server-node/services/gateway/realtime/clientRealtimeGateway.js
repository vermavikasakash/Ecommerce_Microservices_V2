const { Server } = require("socket.io");
const { env } = require("../../shared/config/env");
const { subscribeToEvents } = require("../../shared/utils/rabbitmq");

// Browser-facing realtime bridge. Services talk to RabbitMQ; only clients use Socket.IO.
const emitRealtimeEvent = (io, event) => {
  const { eventName, payload = {} } = event;

  if (eventName === "cart.updated") {
    io.to(payload.customerId).emit("cart:updated", payload);
  }

  if (eventName === "order.created") {
    io.to(payload.customerId).emit("order:created", payload);
  }

  if (eventName === "payment.completed") {
    io.to(payload.customerId).emit("payment:completed", payload);
  }
};

const attachClientRealtimeGateway = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigin,
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    const customerId = socket.handshake.query.customerId || "guest-customer";
    socket.join(customerId);
    socket.emit("gateway:connected", {
      message: "Connected to ecommerce realtime gateway",
      customerId,
    });
  });

  subscribeToEvents("gateway.realtime", (event) => emitRealtimeEvent(io, event));

  return io;
};

module.exports = { attachClientRealtimeGateway };
