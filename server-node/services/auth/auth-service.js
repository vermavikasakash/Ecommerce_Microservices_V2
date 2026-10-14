const http = require("http");
require("colors");
const { createServiceApp } = require("../shared/utils/createServiceApp");
const { env } = require("../shared/config/env");
const { connect } = require("../shared/config/db");
const { authRouter } = require("./routes/authRoutes");

const app = createServiceApp({
  serviceName: "Auth Service",
  registerRoutes: (app) => {
    app.use("/api/auth", authRouter);
  },
});

const port = env.servicePorts.auth;
const server = http.createServer(app);

(async () => {
  try {
    await connect();

    server.listen(port, (err) => {
      if (err) console.log(err);
      console.log(`Auth Service running on port ${port}`.bgMagenta);
    });
  } catch (err) {
    console.error("Failed to start Auth Service:", err.message);
    process.exit(1);
  }
})();
