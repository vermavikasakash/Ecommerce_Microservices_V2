const express = require("express");
const { asyncHandler } = require("../../shared/utils/asyncHandler");
const { ProductController } = require("../controllers/ProductController");
const { ProductRepository } = require("../repositories/ProductRepository");
const { ProductService } = require("../services/ProductService");
const { InventoryReservationRepository } = require("../repositories/InventoryReservationRepository");
const { InventoryService } = require("../services/InventoryService");

const productRepository = new ProductRepository();
const productService = new ProductService(productRepository);
const inventoryService = new InventoryService(
  productRepository,
  new InventoryReservationRepository()
);
const productController = new ProductController(productService, inventoryService);

const productRouter = express.Router();

productRouter.get("/", asyncHandler(productController.list));
productRouter.post("/reservations", asyncHandler(productController.reserve));
productRouter.get("/reservations/:reservationId", asyncHandler(productController.getReservation));
productRouter.delete("/reservations/:reservationId", asyncHandler(productController.release));
productRouter.post("/reservations/:reservationId/commit", asyncHandler(productController.commit));
productRouter.get("/:productId", asyncHandler(productController.getById));

module.exports = { productRouter, productService, inventoryService };
