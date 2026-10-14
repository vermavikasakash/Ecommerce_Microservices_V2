const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

const getBearerToken = (req) => {
  const header = req.header("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim();
};

const authenticate = (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).send({ success: false, message: "Authentication required" });
  }

  try {
    const user = jwt.verify(token, env.jwtSecret);
    req.user = user;
    req.customerId = user.sub;
    return next();
  } catch (err) {
    return res.status(401).send({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = { authenticate, getBearerToken };
