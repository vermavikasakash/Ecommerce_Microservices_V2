class ProductService {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async listProducts() {
    return this.productRepository.findAll();
  }

  async getProduct(productId) {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    return product;
  }
}

module.exports = { ProductService };
