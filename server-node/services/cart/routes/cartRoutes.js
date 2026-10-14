const express = require("express");
const { asyncHandler } = require("../../shared/utils/asyncHandler");
const { CartController } = require("../controllers/CartController");
const { CartRepository } = require("../repositories/CartRepository");
const { CartService } = require("../services/CartService");

const cartRepository = new CartRepository();
const cartService = new CartService(cartRepository);
const cartController = new CartController(cartService);

const cartRouter = express.Router();

cartRouter.get("/", asyncHandler(cartController.get));
cartRouter.post("/items", asyncHandler(cartController.addItem));
cartRouter.patch("/items/:productId", asyncHandler(cartController.updateItem));
cartRouter.delete("/items/:productId", asyncHandler(cartController.removeItem));
cartRouter.delete("/", asyncHandler(cartController.clear));

module.exports = { cartRouter, cartService };
