const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { env } = require("../config/env.js");
const { customerContext } = require("../middleware/customerContext.js");
const { errorHandler } = require("../middleware/errorHandler.js");

const createServiceApp = ({ serviceName, registerRoutes }) => {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(morgan("dev"));
  app.use(customerContext);

  app.get("/health", (req, res) => {
    res.status(200).send({
      success: true,
      service: serviceName,
      status: "up",
    });
  });

  registerRoutes(app);
  app.use(errorHandler);

  return app;
};

module.exports = { createServiceApp };
