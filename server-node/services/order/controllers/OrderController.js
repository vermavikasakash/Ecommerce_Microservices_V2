class OrderController {
  constructor(orderService) {
    this.orderService = orderService;
  }

  list = async (req, res) => {
    const orders = await this.orderService.listOrders(req.customerId);

    res.status(200).send({
      success: true,
      orders,
    });
  };

  prepare = async (req, res) => {
    const checkout = await this.orderService.prepareOrder(
      req.customerId,
      req.body,
      req.header("idempotency-key")
    );

    res.status(checkout.alreadyConfirmed ? 200 : 201).send({
      success: true,
      ...checkout,
    });
  };

  confirm = async (req, res) => {
    const order = await this.orderService.confirmOrder(
      req.customerId,
      req.body,
      req.header("idempotency-key")
    );

    res.status(201).send({
      success: true,
      message: "Order placed successfully",
      order,
    });
  };

  cancel = async (req, res) => {
    const order = await this.orderService.cancelOrder(
      req.customerId,
      req.header("idempotency-key")
    );

    res.status(200).send({
      success: true,
      message: "Checkout cancelled",
      order,
    });
  };
}

module.exports = { OrderController };
