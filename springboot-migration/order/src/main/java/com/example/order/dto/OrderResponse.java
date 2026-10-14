package com.example.order.dto;

import com.example.order.model.Order;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Public API representation of an order. Internal persistence and provider fields stay private. */
public record OrderResponse(
        String id,
        String status,
        List<Item> items,
        Double total,
        Payment payment,
        String createdAt,
        String confirmedAt) {

    public static OrderResponse from(Order order) {
        List<Item> items = new ArrayList<>();
        if (order.getItems() != null) {
            for (Order.OrderItem item : order.getItems()) {
                items.add(new Item(
                        item.getProductId(), item.getName(), item.getPrice(),
                        item.getImage(), item.getQuantity(), item.getLineTotal()));
            }
        }

        Payment payment = toPayment(order);
        return new OrderResponse(
                order.getOrderId(), order.getStatus(), items, order.getTotal(),
                payment, order.getCreatedAt(), order.getConfirmedAt());
    }

    private static Payment toPayment(Order order) {
        Map<String, Object> transaction = order.getPayment();
        String status = transaction == null ? null : stringValue(transaction.get("status"));
        String method = null;
        String razorpayPaymentId = null;
        String capturedAt = transaction == null ? null : stringValue(transaction.get("capturedAt"));

        if (transaction != null && transaction.get("payment") instanceof Map<?, ?> providerPayment) {
            method = stringValue(providerPayment.get("method"));
            razorpayPaymentId = stringValue(providerPayment.get("id"));
        }

        if (status == null && order.getPaymentTransactionId() != null) {
            status = "cancelled".equals(order.getStatus()) ? "cancelled" : "pending";
        }

        if (order.getPaymentTransactionId() == null && transaction == null) {
            return null;
        }

        return new Payment(
                "Razorpay", method, status, order.getPaymentTransactionId(),
                razorpayPaymentId, capturedAt);
    }

    private static String stringValue(Object value) {
        return value == null ? null : value.toString();
    }

    public record Item(
            Integer productId,
            String name,
            Double price,
            String image,
            Integer quantity,
            Double lineTotal) {}

    public record Payment(
            String provider,
            String method,
            String status,
            String transactionId,
            String razorpayPaymentId,
            String capturedAt) {}
}
