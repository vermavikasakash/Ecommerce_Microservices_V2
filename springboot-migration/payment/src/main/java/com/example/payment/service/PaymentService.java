package com.example.payment.service;

import com.example.payment.model.PaymentTransaction;
import com.example.payment.repository.PaymentTransactionRepository;
import com.razorpay.RazorpayClient;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentTransactionRepository repository;
    private final String keyId;
    private final String keySecret;
    private final RealtimePublisher realtimePublisher;

    public PaymentService(
            PaymentTransactionRepository repository,
            RealtimePublisher realtimePublisher,
            @Value("${razorpay.key-id:}") String keyId,
            @Value("${razorpay.key-secret:}") String keySecret) {

        this.repository = repository;
        this.realtimePublisher = realtimePublisher;
        this.keyId = keyId;
        this.keySecret = keySecret;
    }

    public Map<String, Object> getProviderStatus() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("provider", "razorpay");
        response.put("configured", isConfigured());
        response.put("message", isConfigured() ? "Razorpay enabled" : "Razorpay credentials are not configured");
        response.put("keyId", keyId.isBlank() ? null : keyId);
        return response;
    }

    public Map<String, Object> getPublicKey() {
        if (keyId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Razorpay key ID is not configured");
        }

        return Map.of("success", true, "key", keyId);
    }

    public Map<String, Object> createRazorpayOrder(String customerId, String idempotencyKey, Map<String, Object> request) {

        if (customerId == null || customerId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer ID is required");
        }

        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Idempotency-Key header is required");
        }

        Double amount = toAmount(request.get("amount"));

        if (amount == null || !Double.isFinite(amount) || amount < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be at least INR 1");
        }

        var existing = repository.findByCustomerIdAndIdempotencyKey(customerId, idempotencyKey);

        if (existing.isPresent()) {
            PaymentTransaction transaction = existing.get();

            if ("cancelled".equals(transaction.getStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment transaction has been cancelled");
            }

            if (Double.compare(transaction.getAmount(), amount) != 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Idempotency key was used with a different amount");
            }

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("idempotent", true);
            response.put("transaction", publicTransaction(transaction));
            response.put("order", transaction.getProviderOrder());
            return response;
        }

        requireConfigured();

        try {
            RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", Math.round(amount * 100));
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "receipt_" + System.currentTimeMillis());

            com.razorpay.Order razorpayOrder = razorpay.orders.create(orderRequest);

            Map<String, Object> providerOrder = jsonObjectToMap(razorpayOrder.toJson());

            PaymentTransaction transaction = new PaymentTransaction();
            transaction.setTransactionId("txn_" + UUID.randomUUID());
            transaction.setCustomerId(customerId);
            transaction.setOrderId(request.get("orderId") == null ? null : request.get("orderId").toString());
            transaction.setIdempotencyKey(idempotencyKey);
            transaction.setProvider("razorpay");
            transaction.setAmount(amount);
            transaction.setCurrency("INR");
            transaction.setStatus("created");
            transaction.setRazorpayOrderId(String.valueOf(providerOrder.get("id")));
            transaction.setProviderOrder(providerOrder);
            transaction.setCreatedAt(Instant.now().toString());

            transaction = repository.save(transaction);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("transaction", publicTransaction(transaction));
            response.put("order", providerOrder);
            return response;

        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to create Razorpay order", exception);
        }
    }

    public Map<String, Object> verifyRazorpayPayment(String customerId, Map<String, Object> request) {

        String transactionId = requiredString(request, "transactionId");
        String razorpayOrderId = requiredString(request, "razorpay_order_id");
        String razorpayPaymentId = requiredString(request, "razorpay_payment_id");
        String razorpaySignature = requiredString(request, "razorpay_signature");

        requireConfigured();

        PaymentTransaction transaction = repository.findByTransactionId(transactionId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment transaction not found"));

        if (!transaction.getCustomerId().equals(customerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Payment transaction does not belong to this customer");
        }

        if (!razorpayOrderId.equals(transaction.getRazorpayOrderId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Razorpay order ID does not match this transaction");
        }

        // Idempotent retry after a successful verification.
        if ("captured".equals(transaction.getStatus())) {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("alreadyVerified", true);
            response.put("transaction", publicTransaction(transaction));
            return response;
        }

        if (!"created".equals(transaction.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment transaction cannot be verified in its current status");
        }

        try {
            // Razorpay signature = HMAC-SHA256(orderId + "|" + paymentId).
            String expectedSignature = generateSignature(razorpayOrderId + "|" + razorpayPaymentId, keySecret);

            boolean validSignature = MessageDigest.isEqual(expectedSignature.getBytes(StandardCharsets.UTF_8), razorpaySignature.getBytes(StandardCharsets.UTF_8));

            if (!validSignature) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Razorpay payment signature");
            }

            RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);

            // Independently fetch the payment from Razorpay.
            com.razorpay.Payment payment = razorpay.payments.fetch(razorpayPaymentId);

            JSONObject paymentJson = payment.toJson();

            String fetchedOrderId = paymentJson.optString("order_id", "");
            long paymentAmount = paymentJson.optLong("amount", -1);
            String paymentCurrency = paymentJson.optString("currency", "");
            String paymentStatus = paymentJson.optString("status", "");

            long expectedAmount = Math.round(transaction.getAmount() * 100);

            if (!razorpayOrderId.equals(fetchedOrderId) || paymentAmount != expectedAmount || !"INR".equalsIgnoreCase(paymentCurrency)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment details do not match the transaction");
            }

            if (!"captured".equals(paymentStatus)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Razorpay payment is not captured yet");
            }

            transaction.setPayment(jsonObjectToMap(paymentJson));
            transaction.setStatus("captured");
            transaction.setCapturedAt(Instant.now().toString());

            transaction = repository.save(transaction);

            Map<String, Object> paymentMap = new LinkedHashMap<>();
            paymentMap.put("paymentId", razorpayPaymentId);
            paymentMap.put("razorpayOrderId", razorpayOrderId);
            paymentMap.put("status", "captured");
            paymentMap.put("amount", transaction.getAmount());
            paymentMap.put("method", "razorpay");

            Map<String, Object> eventPayload = new LinkedHashMap<>();
            eventPayload.put("customerId", transaction.getCustomerId());
            eventPayload.put("transaction", publicTransaction(transaction));
            eventPayload.put("payment", paymentMap);

            try {
                realtimePublisher.publishEvent("payment.completed", eventPayload);
            } catch (RuntimeException exception) {
                System.err.println(
                        "Failed to publish payment.completed: " + exception.getMessage()
                );
            }


            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("alreadyVerified", false);
            response.put("transaction", publicTransaction(transaction));
            return response;

        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to verify payment with Razorpay", exception);
        }
    }


    // cancel transaction
    public Map<String, Object> cancelTransaction(String customerId, String transactionId) {

        PaymentTransaction transaction = repository.findByTransactionId(transactionId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment transaction not found"));

        if (!transaction.getCustomerId().equals(customerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Payment transaction does not belong to this customer");
        }

        if ("cancelled".equals(transaction.getStatus())) {
            return Map.of("success", true, "alreadyCancelled", true, "transactionId", transactionId);
        }

        if (!"created".equals(transaction.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only created transactions can be cancelled");
        }

        transaction.setStatus("cancelled");
        repository.save(transaction);

        return Map.of("success", true, "alreadyCancelled", false, "transactionId", transactionId, "status", "cancelled");
    }

    private String generateSignature(String payload, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));

        byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();

        for (byte value : hash) {
            hex.append(String.format("%02x", value & 0xff));
        }

        return hex.toString();
    }

    private String requiredString(Map<String, Object> request, String key) {
        Object value = request == null ? null : request.get(key);

        if (value == null || value.toString().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " is required");
        }

        return value.toString();
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Razorpay is not configured");
        }
    }

    private boolean isConfigured() {
        return keyId != null && !keyId.isBlank() && keySecret != null && !keySecret.isBlank();
    }

    private Double toAmount(Object value) {
        return value instanceof Number number ? number.doubleValue() : null;
    }

    private Map<String, Object> publicTransaction(PaymentTransaction transaction) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", transaction.getTransactionId());
        result.put("orderId", transaction.getOrderId());
        result.put("amount", transaction.getAmount());
        result.put("currency", transaction.getCurrency());
        result.put("status", transaction.getStatus());
        result.put("razorpayOrderId", transaction.getRazorpayOrderId());
        result.put("payment", transaction.getPayment());
        result.put("capturedAt", transaction.getCapturedAt());
        return result;
    }

    private Map<String, Object> jsonObjectToMap(JSONObject json) {
        Map<String, Object> result = new HashMap<>();
        Iterator<String> keys = json.keys();

        while (keys.hasNext()) {
            String key = keys.next();
            Object value = json.get(key);
            result.put(key, value == JSONObject.NULL ? null : value);
        }

        return result;
    }
}
