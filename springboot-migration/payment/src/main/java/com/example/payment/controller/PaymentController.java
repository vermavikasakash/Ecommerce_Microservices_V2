package com.example.payment.controller;

import com.example.payment.service.PaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/provider")
    public Map<String, Object> getProviderStatus() {
        return paymentService.getProviderStatus();
    }

    @GetMapping("/razorpay/key")
    public Map<String, Object> getPublicKey() {
        return paymentService.getPublicKey();
    }

    @PostMapping("/razorpay/order")
    public ResponseEntity<Map<String, Object>> createRazorpayOrder(@RequestHeader(value = "X-Customer-Id", required = false) String customerId, @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey, @RequestBody Map<String, Object> request) {

        if (customerId == null || customerId.isBlank()) {
            customerId = "guest-customer";
        }

        Map<String, Object> response = paymentService.createRazorpayOrder(customerId, idempotencyKey, request);

        boolean idempotent = Boolean.TRUE.equals(response.get("idempotent"));

        return ResponseEntity.status(idempotent ? HttpStatus.OK : HttpStatus.CREATED).body(response);
    }

    @PostMapping("/razorpay/verify")
    public Map<String, Object> verifyRazorpayPayment(@RequestHeader("X-Customer-Id") String customerId, @RequestBody Map<String, Object> request) {

        return paymentService.verifyRazorpayPayment(customerId, request);
    }

    @PostMapping("/razorpay/cancel")
    public Map<String, Object> cancelTransaction(@RequestHeader("X-Customer-Id") String customerId, @RequestBody Map<String, Object> request) {

        Object transactionId = request.get("transactionId");

        if (transactionId == null || transactionId.toString().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "transactionId is required");
        }
        return paymentService.cancelTransaction(customerId, transactionId.toString());
    }


}
