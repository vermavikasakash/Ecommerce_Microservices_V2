const http = require("http");
require("colors");
const { createServiceApp } = require("../shared/utils/createServiceApp");
const { env } = require("../shared/config/env");
const { orderRouter } = require("./routes/orderRoutes");
const { connect } = require("../shared/config/db");

const app = createServiceApp({
  serviceName: "Order Service",
  registerRoutes: (app) => {
    app.use("/api/orders", orderRouter);
  },
});

const port = env.servicePorts.orders;
const server = http.createServer(app);

(async () => {
  try {
    await connect();

    server.listen(port, (err) => {
      if (err) console.log(err);
      console.log(`Order Service running on port ${port}`.bgYellow);
    });
  } catch (err) {
    console.error('Failed to start Order Service:', err.message);
    process.exit(1);
  }
})();
