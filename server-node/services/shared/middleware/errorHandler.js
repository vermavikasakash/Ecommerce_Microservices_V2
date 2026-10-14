const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).send({
    success: false,
    message: err.message || "Internal server error",
  });
};

module.exports = { errorHandler };
