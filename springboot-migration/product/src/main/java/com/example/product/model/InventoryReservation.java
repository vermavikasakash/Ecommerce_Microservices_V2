
package com.example.product.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.List;

@Document(collection = "inventory_reservations")
public class InventoryReservation {

    @Id
    private String mongoId;

    @Field("id")
    @JsonProperty("id")
    private String reservationId;

    private String customerId;
    private List<ReservationItem> items;
    private String status;
    private Instant expiresAt;
    private String createdAt;
    private String releasedAt;
    private String committedAt;

    public InventoryReservation() {}

    public String getMongoId() { return mongoId; }
    public void setMongoId(String mongoId) { this.mongoId = mongoId; }

    public String getReservationId() { return reservationId; }
    public void setReservationId(String reservationId) {
        this.reservationId = reservationId;
    }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }

    public List<ReservationItem> getItems() { return items; }
    public void setItems(List<ReservationItem> items) {
        this.items = items;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getReleasedAt() { return releasedAt; }
    public void setReleasedAt(String releasedAt) {
        this.releasedAt = releasedAt;
    }

    public String getCommittedAt() { return committedAt; }
    public void setCommittedAt(String committedAt) {
        this.committedAt = committedAt;
    }

    public static class ReservationItem {
        private Integer productId;
        private int quantity;

        public ReservationItem() {}

        public ReservationItem(Integer productId, int quantity) {
            this.productId = productId;
            this.quantity = quantity;
        }

        public Integer getProductId() { return productId; }
        public void setProductId(Integer productId) {
            this.productId = productId;
        }

        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) {
            this.quantity = quantity;
        }
    }
}
