package com.example.cart.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class ProductClient {

    private final RestClient restClient;

    public ProductClient(
            RestClient.Builder builder,
            @Value("${services.product.url}") String productUrl) {

        this.restClient = builder
                .baseUrl(productUrl)
                .build();
    }

    public Map<String, Object> getProductById(
            Integer productId,
            String customerId) {

        return restClient.get()
                .uri("/api/products/{id}", productId)
                .header("X-Customer-Id", customerId)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {
                });
    }
}