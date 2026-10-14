package com.example.gateway;

import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;

@Component
public class LoggingFilter implements GlobalFilter, Ordered {

    @Override
    public reactor.core.publisher.Mono<Void> filter(org.springframework.web.server.ServerWebExchange exchange, org.springframework.cloud.gateway.filter.GatewayFilterChain chain) {

        System.out.println("[GATEWAY] " + exchange.getRequest().getMethod() + " " + exchange.getRequest().getURI().getPath());

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return -1;
    }
}