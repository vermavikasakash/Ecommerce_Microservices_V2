package com.example.gateway;

import com.example.gateway.security.JwtTokenService;
import io.jsonwebtoken.JwtException;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private final JwtTokenService jwtTokenService;

    public JwtAuthenticationFilter(JwtTokenService jwtTokenService) {
        this.jwtTokenService = jwtTokenService;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        // Product browsing and authentication remain public.
        // Protect customer-specific APIs.
        boolean protectedRoute = path.startsWith("/api/cart/")
                || path.equals("/api/cart")
                || path.startsWith("/api/orders/")
                || path.equals("/api/orders")
                || path.startsWith("/api/payments/");

        if (!protectedRoute) {
            return chain.filter(exchange);
        }

        String authorization = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return unauthorized(exchange);
        }

        String token = authorization.substring(7).trim();

        if (token.isEmpty()) {
            return unauthorized(exchange);
        }

        final String customerId;

        try {
            customerId = jwtTokenService.getCustomerId(token);
        } catch (JwtException | IllegalArgumentException exception) {
            return unauthorized(exchange);
        }

        // Never trust a customer ID supplied by the browser.
        ServerWebExchange authenticatedExchange = exchange.mutate().request(request -> request.headers(headers -> {
            headers.remove("X-Customer-Id");
            headers.set("X-Customer-Id", customerId);
        })).build();

        return chain.filter(authenticatedExchange);
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    @Override
    public int getOrder() {
        return -2;
    }
}
