package com.example.order.model;

import lombok.*;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "orders")
@CompoundIndex(
        name = "customer_idempotency_unique",
        def = "{'customerId': 1, 'idempotencyKey': 1}",
        unique = true
)
public class Order {

    @Id
    private String mongoId;

    @Field("id")
    private String orderId;

    private String customerId;
    private Map<String, Object> customer;
    private List<OrderItem> items;
    private Double total;

    private Map<String, Object> payment;
    private String paymentTransactionId;
    private Map<String, Object> paymentOrder;

    private String inventoryReservationId;
    private String idempotencyKey;
    private String status;
    private String createdAt;
    private String confirmedAt;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItem {

        private Integer productId;
        private String name;
        private Double price;
        private String image;
        private Integer quantity;
        private Double lineTotal;
    }
}
