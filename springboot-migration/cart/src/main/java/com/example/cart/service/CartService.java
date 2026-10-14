package com.example.cart.service;

import com.example.cart.client.ProductClient;
import com.example.cart.model.Cart;
import com.example.cart.model.Cart.CartItem;
import com.example.cart.repository.CartRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Map;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final ProductClient productClient;
    private final RealtimePublisher realtimePublisher;

    public CartService(CartRepository cartRepository,
                       ProductClient productClient,
                       RealtimePublisher realtimePublisher) {
        this.cartRepository = cartRepository;
        this.productClient = productClient;
        this.realtimePublisher = realtimePublisher;
    }

    public Cart getCart(String customerId) {
        return cartRepository.findByCustomerId(customerId).orElseGet(() -> createEmptyCart(customerId));
    }


    public Cart addItem(String customerId, Integer productId, Integer quantity) {

        if (productId == null || productId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid product ID");
        }

        int nextQuantity = (quantity == null) ? 1 : quantity;

        if (nextQuantity <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Quantity must be greater than zero");
        }

        Map<String, Object> product =
                productClient.getProductById(productId, customerId);

        if (product == null || product.get("id") == null
                || product.get("price") == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Product not found");
        }

        Cart cart = getCart(customerId);

        if (cart.getItems() == null) {
            cart.setItems(new ArrayList<>());
        }

        Integer actualProductId =
                ((Number) product.get("id")).intValue();

        String name = (String) product.get("name");
        Double price = ((Number) product.get("price")).doubleValue();
        String image = (String) product.get("image");

        CartItem existingItem = cart.getItems().stream()
                .filter(item -> actualProductId.equals(item.getProductId()))
                .findFirst()
                .orElse(null);

        if (existingItem != null) {
            existingItem.setQuantity(
                    existingItem.getQuantity() + nextQuantity);

            existingItem.setLineTotal(
                    existingItem.getPrice() * existingItem.getQuantity());
        } else {
            CartItem item = new CartItem();
            item.setProductId(actualProductId);
            item.setName(name);
            item.setPrice(price);
            item.setImage(image);
            item.setQuantity(nextQuantity);
            item.setLineTotal(price * nextQuantity);

            cart.getItems().add(item);
        }

        return saveCart(cart);
    }

    public Cart updateItem(String customerId, Integer productId, Integer quantity) {

        if (quantity == null || quantity < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be zero or greater");
        }

        Cart cart = getCart(customerId);

        cart.getItems().removeIf(item -> {
            if (!productId.equals(item.getProductId())) {
                return false;
            }

            if (quantity == 0) {
                return true;
            }

            item.setQuantity(quantity);
            item.setLineTotal(item.getPrice() * quantity);
            return false;
        });

        return saveCart(cart);
    }

    public Cart removeItem(String customerId, Integer productId) {
        Cart cart = getCart(customerId);

        cart.getItems().removeIf(item -> productId.equals(item.getProductId()));

        return saveCart(cart);
    }

    public Cart clearCart(String customerId) {
        Cart cart = getCart(customerId);
        cart.setItems(new ArrayList<>());

        return saveCart(cart);
    }


    private Cart saveCart(Cart cart) {
        double total = cart.getItems()
                .stream()
                .mapToDouble(CartItem::getLineTotal)
                .sum();

        cart.setTotal(total);
        cart.setUpdatedAt(Instant.now());

        if (cart.getCreatedAt() == null) {
            cart.setCreatedAt(Instant.now());
        }

        // Save to MongoDB first
        Cart savedCart = cartRepository.save(cart);

        // Publish realtime event to RabbitMQ
        realtimePublisher.publishCartUpdated(
                savedCart.getCustomerId(),
                savedCart
        );

        return savedCart;
    }


    private Cart createEmptyCart(String customerId) {
        Cart cart = new Cart();
        cart.setCustomerId(customerId);
        cart.setItems(new ArrayList<>());
        cart.setTotal(0.0);
        return cart;
    }
}