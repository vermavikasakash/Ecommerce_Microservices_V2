package com.example.order.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;

@Component
public class PaymentClient {

    private final RestClient restClient;

    public PaymentClient(RestClient.Builder builder, @Value("${services.payment.url}") String paymentUrl) {

        this.restClient = builder.baseUrl(paymentUrl).build();
    }


    public Map<String, Object> createPaymentOrder(String customerId, String orderId, Double amount, String idempotencyKey) {

        Map<String, Object> request = new HashMap<>();
        request.put("amount", amount);
        request.put("orderId", orderId);
        request.put("idempotencyKey", idempotencyKey);

        return restClient.post().uri("/api/payments/razorpay/order").header("X-Customer-Id", customerId).header("Idempotency-Key", idempotencyKey).body(request).retrieve().body(new ParameterizedTypeReference<>() {
        });
    }

    public Map<String, Object> verifyPayment(String customerId, String transactionId, String idempotencyKey, Map<String, Object> razorpayDetails) {

        Map<String, Object> request = new HashMap<>(razorpayDetails);
        request.put("transactionId", transactionId);

        return restClient.post().uri("/api/payments/razorpay/verify").header("X-Customer-Id", customerId).header("Idempotency-Key", idempotencyKey).body(request).retrieve().body(new ParameterizedTypeReference<>() {
        });
    }

    public Map<String, Object> cancelPayment(String customerId, String transactionId, String idempotencyKey) {

        Map<String, Object> request = new HashMap<>();
        request.put("transactionId", transactionId);

        return restClient.post().uri("/api/payments/razorpay/cancel").header("X-Customer-Id", customerId).header("Idempotency-Key", idempotencyKey).body(request).retrieve().body(new ParameterizedTypeReference<>() {
        });
    }
}
