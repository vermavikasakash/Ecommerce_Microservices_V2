package com.example.product;

import com.example.product.model.Product;
import com.example.product.repository.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ProductDataLoader implements CommandLineRunner {

    private final ProductRepository productRepository;

    public ProductDataLoader(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public void run(String... args) {
        if (productRepository.count() > 0) {
            return;
        }

        List<Product> products = List.of(
                createProduct(1, "Product 1", "Description 1", 100.0, 10, ""),
                createProduct(2, "Product 2", "Description 2", 200.0, 10, ""),
                createProduct(3, "Product 3", "Description 3", 300.0, 10, ""),
                createProduct(4, "Product 4", "Description 4", 400.0, 10, ""),
                createProduct(5, "Product 5", "Description 5", 500.0, 10, ""),
                createProduct(6, "Product 6", "Description 6", 600.0, 10, ""),
                createProduct(7, "Product 7", "Description 7", 700.0, 10, ""),
                createProduct(8, "Product 8", "Description 8", 800.0, 10, "")
        );

        productRepository.saveAll(products);
    }

    private Product createProduct(
            int id, String name, String description,
            double price, int stock, String image) {

        Product product = new Product();
        product.setId(id);
        product.setName(name);
        product.setDescription(description);
        product.setPrice(price);
        product.setStock(stock);
        product.setImage(image);
        return product;
    }
}
