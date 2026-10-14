package com.example.cart.controller;

import com.example.cart.model.Cart;
import com.example.cart.service.CartService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public Map<String, Object> get(@RequestHeader("X-Customer-Id") String customerId) {

        Cart cart = cartService.getCart(customerId);

        return Map.of("success", true, "cart", cart);
    }

    @PostMapping("/items")
    public Map<String, Object> addItem(@RequestHeader("X-Customer-Id") String customerId, @RequestBody Map<String, Object> request) {

        Integer productId = ((Number) request.get("productId")).intValue();

        Integer quantity = request.get("quantity") == null ? 1 : ((Number) request.get("quantity")).intValue();
        System.out.println("create cart getting called " + "prodId : " + productId + " quantity : " + quantity);
        Cart cart = cartService.addItem(customerId, productId, quantity);


        return Map.of("success", true, "message", "Item added to cart", "cart", cart);
    }

    @PatchMapping("/items/{productId}")
    public Map<String, Object> updateItem(@RequestHeader("X-Customer-Id") String customerId, @PathVariable Integer productId, @RequestBody Map<String, Object> request) {

        Integer quantity = ((Number) request.get("quantity")).intValue();

        Cart cart = cartService.updateItem(customerId, productId, quantity);

        return Map.of("success", true, "message", "Cart item updated", "cart", cart);
    }

    @DeleteMapping("/items/{productId}")
    public Map<String, Object> removeItem(@RequestHeader("X-Customer-Id") String customerId, @PathVariable Integer productId) {

        Cart cart = cartService.removeItem(customerId, productId);

        return Map.of("success", true, "message", "Item removed from cart", "cart", cart);
    }

    @DeleteMapping
    public Map<String, Object> clear(@RequestHeader("X-Customer-Id") String customerId) {

        Cart cart = cartService.clearCart(customerId);

        return Map.of("success", true, "message", "Cart cleared", "cart", cart);
    }
}
