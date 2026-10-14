const { env } = require("../../shared/config/env");
const { makeServiceRequest } = require("../../shared/utils/makeServiceRequest");
const { publishRealtimeEvent } = require("../../shared/utils/realtimePublisher");

class CartService {
  constructor(cartRepository) {
    this.cartRepository = cartRepository;
  }

  async getCart(customerId) {
    return this.cartRepository.findByCustomerId(customerId);
  }

  async addItem(customerId, productId, quantity = 1) {
    // Get product from product service
    const product = await makeServiceRequest(
      env.serviceUrls.products,
      "GET",
      `/api/products/${productId}`,
      null,
      customerId
    );

    if (!product.product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    const productData = product.product;
    const cart = await this.cartRepository.findByCustomerId(customerId);
    const nextQuantity = Number(quantity) || 1;
    const existingItem = cart.items.find((item) => item.productId === productData.id);

    if (existingItem) {
      existingItem.quantity += nextQuantity;
      existingItem.lineTotal = existingItem.quantity * existingItem.price;
    } else {
      cart.items.push({
        productId: productData.id,
        name: productData.name,
        price: productData.price,
        image: productData.image,
        quantity: nextQuantity,
        lineTotal: productData.price * nextQuantity,
      });
    }

    return this.persistAndPublish(cart);
  }

  async updateItem(customerId, productId, quantity) {
    const cart = await this.cartRepository.findByCustomerId(customerId);
    const nextQuantity = Number(quantity);

    if (Number.isNaN(nextQuantity) || nextQuantity < 0) {
      const error = new Error("Quantity must be zero or greater");
      error.statusCode = 400;
      throw error;
    }

    cart.items = cart.items
      .map((item) =>
        item.productId === Number(productId)
          ? { ...item, quantity: nextQuantity, lineTotal: item.price * nextQuantity }
          : item
      )
      .filter((item) => item.quantity > 0);

    return this.persistAndPublish(cart);
  }

  async removeItem(customerId, productId) {
    const cart = await this.cartRepository.findByCustomerId(customerId);
    cart.items = cart.items.filter((item) => item.productId !== Number(productId));

    return this.persistAndPublish(cart);
  }

  async clearCart(customerId) {
    const cart = await this.cartRepository.clear(customerId);
    await publishRealtimeEvent("cart.updated", {
      customerId: cart.customerId,
      cart,
    });
    return cart;
  }

  async persistAndPublish(cart) {
    const nextCart = {
      ...cart,
      total: cart.items.reduce((sum, item) => sum + item.lineTotal, 0),
    };
    const savedCart = await this.cartRepository.save(nextCart);
    await publishRealtimeEvent("cart.updated", {
      customerId: savedCart.customerId,
      cart: savedCart,
    });

    return savedCart;
  }
}

module.exports = { CartService };
