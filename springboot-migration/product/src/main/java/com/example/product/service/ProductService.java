package com.example.product.service;

import com.example.product.model.Product;
import com.example.product.repository.ProductRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public Map<String, Object> getAllProducts() {
        List<Product> products = productRepository.findAll();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("products", products);
        response.put("totalProducts", products.size());

        return response;
    }

    public Product getProductById(Integer id) {
        return productRepository.findProductById(id)
                .orElseThrow(() ->
                        new RuntimeException("Product not found: " + id));
    }
}