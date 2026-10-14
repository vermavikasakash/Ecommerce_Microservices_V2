package com.example.order.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class CartClient {

    private final RestClient restClient;

    public CartClient(
            RestClient.Builder builder,
            @Value("${services.cart.url}") String cartUrl) {

        this.restClient = builder
                .baseUrl(cartUrl)
                .build();
    }

    public Map<String, Object> getCart(String customerId) {
        return restClient.get()
                .uri("/api/cart")
                .header("X-Customer-Id", customerId)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {
                });
    }

    public Map<String, Object> clearCart(String customerId) {
        return restClient.delete()
                .uri("/api/cart")
                .header("X-Customer-Id", customerId)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {
                });
    }
}