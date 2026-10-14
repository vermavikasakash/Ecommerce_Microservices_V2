package com.example.order.service;

import com.example.order.client.PaymentClient;
import com.example.order.client.CartClient;
import com.example.order.client.ProductClient;
import com.example.order.model.Order;
import com.example.order.dto.OrderResponse;
import com.example.order.model.Order.OrderItem;
import com.example.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartClient cartClient;
    private final ProductClient productClient;
    private final PaymentClient paymentClient;
    private final RealtimePublisher realtimePublisher;

    public List<OrderResponse> getCustomerOrders(String customerId) {
        return orderRepository.findByCustomerId(customerId).stream().map(OrderResponse::from).toList();
    }

    public Map<String, Object> prepareCheckout(String customerId, Map<String, Object> checkout, String idempotencyKey) {

        validateCustomerDetails(checkout);
        validateIdempotencyKey(idempotencyKey);

        // Return an existing checkout for the same customer and key.
        var existing = orderRepository.findByCustomerIdAndIdempotencyKey(customerId, idempotencyKey);

        if (existing.isPresent()) {
            Order order = existing.get();

            if ("confirmed".equals(order.getStatus()) || ("pending_payment".equals(order.getStatus()) && order.getInventoryReservationId() != null)) {
                return checkoutResponse(order, true);
            }

            throw new ResponseStatusException(HttpStatus.CONFLICT, "This checkout session cannot be reused");
        }

        // Cart API returns { success: true, cart: {...} }.
        Map<String, Object> cartResponse = cartClient.getCart(customerId);
        Object cartValue = cartResponse.get("cart");

        if (!(cartValue instanceof Map<?, ?> cart)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read customer cart");
        }

        Object rawItems = cart.get("items");

        if (!(rawItems instanceof List<?> cartItems) || cartItems.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one product is required");
        }

        // Re-fetch products so we use current prices, not cart prices.
        List<OrderItem> orderItems = new ArrayList<>();
        double total = 0.0;

        for (Object rawItem : cartItems) {
            if (!(rawItem instanceof Map<?, ?> cartItem)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid cart item");
            }

            Integer productId = toInteger(cartItem.get("productId"));
            Integer quantity = toInteger(cartItem.get("quantity"));

            if (productId == null || productId <= 0 || quantity == null || quantity < 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart contains an invalid product or quantity");
            }

            // Product API returns the product object directly.
            Map<String, Object> product = productClient.getProductById(productId);

            if (product == null || product.get("price") == null || product.get("stock") == null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Product information is incomplete");
            }

            double price = ((Number) product.get("price")).doubleValue();
            int stock = ((Number) product.get("stock")).intValue();

            if (stock < quantity) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient stock for " + product.get("name"));
            }

            OrderItem item = OrderItem.builder().productId(productId).name((String) product.get("name")).price(price).image((String) product.get("image")).quantity(quantity).lineTotal(price * quantity).build();

            orderItems.add(item);
            total += item.getLineTotal();
        }

        String orderId = "ord_" + UUID.randomUUID();

        Map<String, Object> customer = new HashMap<>();
        customer.put("firstName", checkout.get("firstName"));
        customer.put("lastName", checkout.get("lastName"));
        customer.put("address", checkout.get("address"));

        Order order = Order.builder().orderId(orderId).customerId(customerId).customer(customer).items(orderItems).total(total).idempotencyKey(idempotencyKey).status("pending_payment").createdAt(Instant.now().toString()).build();

        // Save the order before reserving stock.
        orderRepository.save(order);

        try {
            // Reserve inventory for 15 minutes.
            String expiresAt = Instant.now().plusSeconds(15 * 60).toString();

            List<Map<String, Object>> reservationItems = orderItems.stream().map(item -> {
                Map<String, Object> reservationItem = new HashMap<>();
                reservationItem.put("productId", item.getProductId());
                reservationItem.put("quantity", item.getQuantity());
                return reservationItem;
            }).toList();

            Map<String, Object> reservationRequest = new HashMap<>();
            reservationRequest.put("reservationId", orderId);
            reservationRequest.put("items", reservationItems);
            reservationRequest.put("expiresAt", expiresAt);

            productClient.reserveInventory(customerId, reservationRequest);

            order.setInventoryReservationId(orderId);

            // Create the Razorpay order using the calculated checkout total
            Map<String, Object> paymentResponse = paymentClient.createPaymentOrder(customerId, orderId, total, idempotencyKey);

            Object transactionValue = paymentResponse.get("transaction");
            Object razorpayOrderValue = paymentResponse.get("order");

            if (!(transactionValue instanceof Map<?, ?> transaction) || !(transaction.get("id") instanceof String transactionId) || !(razorpayOrderValue instanceof Map<?, ?> razorpayOrderMap)) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Payment service returned an invalid response");
            }

            Map<String, Object> razorpayOrder = new HashMap<>();
            razorpayOrderMap.forEach((key, value) -> razorpayOrder.put(String.valueOf(key), value));

            // Persist both IDs: the internal transaction ID and Razorpay order ID.

            order.setPaymentTransactionId(transactionId);
            order.setPaymentOrder(razorpayOrder);
            orderRepository.save(order);

            return checkoutResponse(order, false);


        } catch (RuntimeException exception) {
            order.setStatus("inventory_unavailable");
            orderRepository.save(order);
            throw exception;
        }
    }

    public Map<String, Object> confirmCheckout(String customerId, Map<String, Object> request, String idempotencyKey) {

        validateIdempotencyKey(idempotencyKey);

        Order order = orderRepository.findByCustomerIdAndIdempotencyKey(customerId, idempotencyKey).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Checkout not found"));

        // Safe retry when the order is already confirmed.
        if ("confirmed".equals(order.getStatus())) {
            return Map.of("success", true, "alreadyConfirmed", true, "order", OrderResponse.from(order));
        }

        if (!"pending_payment".equals(order.getStatus()) || order.getPaymentTransactionId() == null || order.getInventoryReservationId() == null || order.getPaymentOrder() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Checkout is not ready for confirmation");
        }

        Object razorpayValue = request == null ? null : request.get("razorpay");

        if (!(razorpayValue instanceof Map<?, ?> razorpayMap)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Razorpay payment details are required");
        }

        Map<String, Object> razorpayDetails = new HashMap<>();
        razorpayMap.forEach((key, value) -> razorpayDetails.put(String.valueOf(key), value));

        // Ensure the browser response belongs to this checkout.
        Object expectedOrderId = order.getPaymentOrder().get("id");
        Object receivedOrderId = razorpayDetails.get("razorpay_order_id");

        if (expectedOrderId == null || !expectedOrderId.equals(receivedOrderId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Razorpay order ID does not match this checkout");
        }

        // Payment service verifies the signature and confirms the
        // captured amount, currency, and payment status with Razorpay.
        Map<String, Object> verification = paymentClient.verifyPayment(customerId, order.getPaymentTransactionId(), idempotencyKey, razorpayDetails);

        if (!Boolean.TRUE.equals(verification.get("success"))) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Payment verification failed");
        }

        Object transactionValue = verification.get("transaction");

        if (!(transactionValue instanceof Map<?, ?> transaction)) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Payment verification returned an invalid response");
        }

        // Persist verified payment information.
        Map<String, Object> payment = new HashMap<>();
        transaction.forEach((key, value) -> payment.put(String.valueOf(key), value));

        order.setPayment(payment);
        orderRepository.save(order);

        // Finalize the inventory reservation.
        productClient.commitReservation(customerId, order.getInventoryReservationId());

        // Clear the cart only after payment verification and inventory commit.
        cartClient.clearCart(customerId);

        order.setStatus("confirmed");
        order.setConfirmedAt(Instant.now().toString());
        orderRepository.save(order);

        // Publish only after checkout preparation succeeds.
        Map<String, Object> eventPayload = new LinkedHashMap<>();
        eventPayload.put("customerId", customerId);
        eventPayload.put("order", OrderResponse.from(order));

        try {
            realtimePublisher.publishEvent("order.created", eventPayload);
        } catch (RuntimeException exception) {
            // Do not mark a successful checkout as failed
            // just because event publishing failed.
            System.err.println(
                    "Failed to publish order.created: " + exception.getMessage()
            );
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("alreadyConfirmed", false);
        response.put("order", OrderResponse.from(order));

        return response;
    }

    public Map<String, Object> cancelCheckout(String customerId, String idempotencyKey) {
        validateIdempotencyKey(idempotencyKey);

        Order order = orderRepository.findByCustomerIdAndIdempotencyKey(customerId, idempotencyKey).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Checkout session not found"));

        if ("cancelled".equals(order.getStatus())) {
            return Map.of("success", true, "alreadyCancelled", true, "order", OrderResponse.from(order));
        }

        if ("confirmed".equals(order.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A confirmed order cannot be cancelled here");
        }

        if (order.getPayment() != null && "captured".equals(order.getPayment().get("status"))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Captured payments require a refund flow");
        }

        if (order.getPaymentTransactionId() != null) {
            Map<String, Object> paymentResponse = paymentClient.cancelPayment(customerId, order.getPaymentTransactionId(), idempotencyKey);
            if (!Boolean.TRUE.equals(paymentResponse.get("success"))) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to cancel payment transaction");
            }
        }

        if (order.getInventoryReservationId() != null) {
            productClient.releaseReservation(customerId, order.getInventoryReservationId());
        }

        order.setStatus("cancelled");
        orderRepository.save(order);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("alreadyCancelled", false);
        response.put("message", "Checkout cancelled");
        response.put("order", OrderResponse.from(order));
        return response;
    }

    private void validateCustomerDetails(Map<String, Object> checkout) {
        if (checkout == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Checkout details are required");
        }

        for (String field : List.of("firstName", "lastName", "address")) {
            Object value = checkout.get(field);

            if (value == null || value.toString().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
            }
        }
    }

    private void validateIdempotencyKey(String key) {
        if (key == null || key.length() < 8 || key.length() > 128) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid Idempotency-Key header is required");
        }
    }

    private Integer toInteger(Object value) {
        if (!(value instanceof Number number)) {
            return null;
        }

        double numericValue = number.doubleValue();

        if (!Double.isFinite(numericValue) || numericValue != Math.floor(numericValue) || numericValue < Integer.MIN_VALUE || numericValue > Integer.MAX_VALUE) {
            return null;
        }

        return (int) numericValue;
    }

    private Map<String, Object> checkoutResponse(Order order, boolean alreadyExists) {

        Map<String, Object> checkout = new LinkedHashMap<>();
        checkout.put("order", OrderResponse.from(order));
        checkout.put("paymentOrder", publicRazorpayOrder(order.getPaymentOrder()));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("alreadyExists", alreadyExists);
        response.put("alreadyConfirmed", "confirmed".equals(order.getStatus()));
        response.put("checkout", checkout);

        return response;
    }

    private Map<String, Object> publicRazorpayOrder(Map<String, Object> providerOrder) {
        if (providerOrder == null) {
            return null;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", providerOrder.get("id"));
        result.put("amount", providerOrder.get("amount"));
        result.put("currency", providerOrder.get("currency"));
        return result;
    }
}
