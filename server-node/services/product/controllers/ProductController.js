class ProductController {
  constructor(productService, inventoryService) {
    this.productService = productService;
    this.inventoryService = inventoryService;
  }

  list = async (req, res) => {
    const products = await this.productService.listProducts();

    res.status(200).send({
      success: true,
      message: "Products fetched successfully",
      products,
    });
  };

  getById = async (req, res) => {
    const product = await this.productService.getProduct(req.params.productId);

    res.status(200).send({
      success: true,
      product,
    });
  };

  reserve = async (req, res) => {
    const reservation = await this.inventoryService.reserve({
      reservationId: req.body.reservationId,
      customerId: req.customerId,
      items: req.body.items,
      expiresAt: req.body.expiresAt,
    });

    res.status(201).send({
      success: true,
      reservation,
    });
  };

  release = async (req, res) => {
    const reservation = await this.inventoryService.release(
      req.params.reservationId,
      req.customerId
    );

    res.status(200).send({
      success: true,
      reservation,
    });
  };

  getReservation = async (req, res) => {
    const reservation = await this.inventoryService.get(
      req.params.reservationId,
      req.customerId
    );

    res.status(200).send({
      success: true,
      reservation,
    });
  };

  commit = async (req, res) => {
    const reservation = await this.inventoryService.commit(
      req.params.reservationId,
      req.customerId
    );

    res.status(200).send({
      success: true,
      reservation,
    });
  };
}

module.exports = { ProductController };
