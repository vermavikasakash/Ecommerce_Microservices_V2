const http = require("http");
require("colors");
const { createServiceApp } = require("../shared/utils/createServiceApp");
const { env } = require("../shared/config/env");
const { productRouter, inventoryService } = require("./routes/productRoutes");
const { connect } = require("../shared/config/db");

const app = createServiceApp({
  serviceName: "Product Service",
  registerRoutes: (app) => {
    app.use("/api/products", productRouter);
  },
});

const port = env.servicePorts.products;
const server = http.createServer(app);

(async () => {
  try {
    await connect();

    // Seed products into DB if empty
    if (process.env.MONGODB_URI) {
      try {
        const Product = require("./models/ProductModel");
        const count = await Product.countDocuments();
        if (!count) {
          const { products } = require("./data/products");
          await Product.insertMany(products.map(p => ({ ...p })));
          console.log('Seeded products into MongoDB');
        }
      } catch (err) {
        console.warn('Product seeding skipped:', err.message);
      }
    }

    server.listen(port, (err) => {
      if (err) console.log(err);
      console.log(`Product Service running on port ${port}`.bgCyan);
    });

    const reservationSweep = setInterval(
      () => inventoryService.releaseExpiredReservations(),
      60 * 1000
    );
    reservationSweep.unref();
  } catch (err) {
    console.error('Failed to start Product Service:', err.message);
    process.exit(1);
  }
})();
