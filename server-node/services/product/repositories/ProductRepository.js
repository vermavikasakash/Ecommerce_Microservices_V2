let ProductModel;
try {
  ProductModel = require('../models/ProductModel');
} catch (err) {
  ProductModel = null;
}

const { products } = require("../data/products");

class ProductRepository {
  async findAll() {
    if (ProductModel && process.env.MONGODB_URI) {
      return ProductModel.find().lean();
    }
    return products;
  }

  async findById(productId) {
    if (ProductModel && process.env.MONGODB_URI) {
      return ProductModel.findOne({ id: Number(productId) }).lean();
    }
    return products.find((product) => product.id === Number(productId));
  }

  async decrementIfAvailable(productId, quantity) {
    if (ProductModel && process.env.MONGODB_URI) {
      return ProductModel.findOneAndUpdate(
        { id: Number(productId), stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      ).lean();
    }

    const product = products.find((item) => item.id === Number(productId));
    if (!product || product.stock < quantity) return null;

    product.stock -= quantity;
    return { ...product };
  }

  async incrementStock(productId, quantity) {
    if (ProductModel && process.env.MONGODB_URI) {
      return ProductModel.findOneAndUpdate(
        { id: Number(productId) },
        { $inc: { stock: quantity } },
        { new: true }
      ).lean();
    }

    const product = products.find((item) => item.id === Number(productId));
    if (!product) return null;

    product.stock += quantity;
    return { ...product };
  }
}

module.exports = { ProductRepository };
