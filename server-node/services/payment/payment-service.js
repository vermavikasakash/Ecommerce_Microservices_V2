const http = require("http");
require("colors");
const { createServiceApp } = require("../shared/utils/createServiceApp");
const { env } = require("../shared/config/env");
const { paymentRouter } = require("./routes/paymentRoutes");
const { connect } = require("../shared/config/db");

const app = createServiceApp({
  serviceName: "Payment Service",
  registerRoutes: (app) => {
    app.use("/api/payments", paymentRouter);
  },
});

const port = env.servicePorts.payments;
const server = http.createServer(app);

(async () => {
  try {
    await connect();

    server.listen(port, (err) => {
      if (err) console.log(err);
      console.log(`Payment Service running on port ${port}`.bgRed);
    });
  } catch (err) {
    console.error('Failed to start Payment Service:', err.message);
    process.exit(1);
  }
})();
