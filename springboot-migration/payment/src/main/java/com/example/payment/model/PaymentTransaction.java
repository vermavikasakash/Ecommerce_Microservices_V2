package com.example.payment.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.Map;

@Document(collection = "paymenttransactions")
@CompoundIndex(
        name = "customer_idempotency_unique",
        def = "{'customerId': 1, 'idempotencyKey': 1}",
        unique = true
)
public class PaymentTransaction {

    @Id
    private String mongoId;

    @Field("id")
    private String transactionId;

    private String customerId;
    private String orderId;
    private String idempotencyKey;
    private String provider;
    private Double amount;
    private String currency;
    private String status;
    private String razorpayOrderId;
    private Map<String, Object> providerOrder;
    private Map<String, Object> payment;
    private String createdAt;
    private String capturedAt;

    public PaymentTransaction() {}

    public String getMongoId() { return mongoId; }
    public void setMongoId(String mongoId) { this.mongoId = mongoId; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRazorpayOrderId() { return razorpayOrderId; }
    public void setRazorpayOrderId(String razorpayOrderId) { this.razorpayOrderId = razorpayOrderId; }

    public Map<String, Object> getProviderOrder() { return providerOrder; }
    public void setProviderOrder(Map<String, Object> providerOrder) { this.providerOrder = providerOrder; }

    public Map<String, Object> getPayment() { return payment; }
    public void setPayment(Map<String, Object> payment) { this.payment = payment; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getCapturedAt() { return capturedAt; }
    public void setCapturedAt(String capturedAt) { this.capturedAt = capturedAt; }
}
