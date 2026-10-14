const CUSTOMER_HEADER = "x-customer-id";

const customerContext = (req, res, next) => {
  req.customerId = req.header(CUSTOMER_HEADER) || "guest-customer";
  next();
};

module.exports = { CUSTOMER_HEADER, customerContext };
