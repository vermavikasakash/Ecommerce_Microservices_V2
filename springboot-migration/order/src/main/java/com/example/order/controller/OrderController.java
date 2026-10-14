package com.example.order.controller;

import com.example.order.dto.OrderResponse;
import com.example.order.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getCustomerOrders(
            @RequestHeader("X-Customer-Id") String customerId) {
        List<OrderResponse> orders = orderService.getCustomerOrders(customerId);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("orders", orders);
        response.put("totalOrders", orders.size());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/prepare")
    public ResponseEntity<Map<String, Object>> prepareCheckout(
            @RequestHeader("X-Customer-Id") String customerId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody Map<String, Object> checkout) {
        Map<String, Object> response = orderService.prepareCheckout(
                customerId, checkout, idempotencyKey);
        boolean alreadyExists = Boolean.TRUE.equals(response.get("alreadyExists"));
        return ResponseEntity.status(alreadyExists ? HttpStatus.OK : HttpStatus.CREATED)
                .body(response);
    }

    @PostMapping("/confirm")
    public ResponseEntity<Map<String, Object>> confirmCheckout(
            @RequestHeader("X-Customer-Id") String customerId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(orderService.confirmCheckout(
                customerId, request, idempotencyKey));
    }

    @PostMapping("/cancel")
    public ResponseEntity<Map<String, Object>> cancelCheckout(
            @RequestHeader("X-Customer-Id") String customerId,
            @RequestHeader("Idempotency-Key") String idempotencyKey) {
        return ResponseEntity.ok(orderService.cancelCheckout(customerId, idempotencyKey));
    }
}
