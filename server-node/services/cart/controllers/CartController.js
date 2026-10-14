class CartController {
  constructor(cartService) {
    this.cartService = cartService;
  }

  get = async (req, res) => {
    const cart = await this.cartService.getCart(req.customerId);
    res.status(200).send({ success: true, cart });
  };

  addItem = async (req, res) => {
    const { productId, quantity } = req.body;
    const cart = await this.cartService.addItem(req.customerId, productId, quantity);

    res.status(201).send({
      success: true,
      message: "Item added to cart",
      cart,
    });
  };

  updateItem = async (req, res) => {
    const cart = await this.cartService.updateItem(
      req.customerId,
      req.params.productId,
      req.body.quantity
    );

    res.status(200).send({
      success: true,
      message: "Cart item updated",
      cart,
    });
  };

  removeItem = async (req, res) => {
    const cart = await this.cartService.removeItem(req.customerId, req.params.productId);

    res.status(200).send({
      success: true,
      message: "Item removed from cart",
      cart,
    });
  };

  clear = async (req, res) => {
    const cart = await this.cartService.clearCart(req.customerId);

    res.status(200).send({
      success: true,
      message: "Cart cleared",
      cart,
    });
  };
}

module.exports = { CartController };
