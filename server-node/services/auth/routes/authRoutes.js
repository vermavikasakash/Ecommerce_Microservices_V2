const express = require("express");
const { asyncHandler } = require("../../shared/utils/asyncHandler");
const { AuthService } = require("../services/AuthService");

const authService = new AuthService();
const authRouter = express.Router();

authRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.signup(email, password);
    res.status(201).send({ success: true, ...result });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).send({ success: true, ...result });
  })
);

module.exports = { authRouter };
