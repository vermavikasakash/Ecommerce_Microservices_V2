package com.example.order.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class ProductClient {

    private final RestClient restClient;

    public ProductClient(RestClient.Builder builder, @Value("${services.product.url}") String productUrl) {

        this.restClient = builder.baseUrl(productUrl).build();
    }

    public Map<String, Object> getProductById(Integer productId) {
        return restClient.get().uri("/api/products/{id}", productId)
                .retrieve().body(new ParameterizedTypeReference<>() {
                });
    }

    public Map<String, Object> reserveInventory(String customerId, Map<String, Object> request) {

        return restClient.post().uri("/api/products/reservations")
                .header("X-Customer-Id", customerId)
                .body(request).retrieve().body(new ParameterizedTypeReference<>() {
                });
    }

    public Map<String, Object> getReservation(String customerId, String reservationId) {

        return restClient.get()
                .uri("/api/products/reservations/{reservationId}", reservationId)
                .header("X-Customer-Id", customerId).retrieve()
                .body(new ParameterizedTypeReference<>() {
                });
    }

    public Map<String, Object> commitReservation(String customerId, String reservationId) {

        return restClient.post()
                .uri("/api/products/reservations/{reservationId}/commit", reservationId)
                .header("X-Customer-Id", customerId).retrieve()
                .body(new ParameterizedTypeReference<>() {
                });
    }

    public void releaseReservation(String customerId, String reservationId) {

        restClient.delete()
                .uri("/api/products/reservations/{reservationId}", reservationId)
                .header("X-Customer-Id", customerId).retrieve().toBodilessEntity();
    }
}