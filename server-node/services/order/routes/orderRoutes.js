const express = require("express");
const { asyncHandler } = require("../../shared/utils/asyncHandler");
const { OrderController } = require("../controllers/OrderController");
const { OrderRepository } = require("../repositories/OrderRepository");
const { OrderService } = require("../services/OrderService");

const orderService = new OrderService(new OrderRepository());
const orderController = new OrderController(orderService);

const orderRouter = express.Router();

orderRouter.get("/", asyncHandler(orderController.list));
orderRouter.post("/prepare", asyncHandler(orderController.prepare));
orderRouter.post("/confirm", asyncHandler(orderController.confirm));
orderRouter.post("/cancel", asyncHandler(orderController.cancel));
orderRouter.post("/", asyncHandler(orderController.confirm));

module.exports = { orderRouter, orderService };
