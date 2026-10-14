const http = require("http");
require("colors");
const { createServiceApp } = require("../shared/utils/createServiceApp");
const { env } = require("../shared/config/env");
const { cartRouter } = require("./routes/cartRoutes");
const { connect } = require("../shared/config/db");

const app = createServiceApp({
  serviceName: "Cart Service",
  registerRoutes: (app) => {
    app.use("/api/cart", cartRouter);
  },
});

const port = env.servicePorts.cart;
const server = http.createServer(app);

(async () => {
  try {
    await connect();

    server.listen(port, (err) => {
      if (err) console.log(err);
      console.log(`Cart Service running on port ${port}`.bgMagenta);
    });
  } catch (err) {
    console.error('Failed to start Cart Service:', err.message);
    process.exit(1);
  }
})();
