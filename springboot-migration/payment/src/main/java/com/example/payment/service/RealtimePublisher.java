package com.example.payment.service;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class RealtimePublisher {

    private final RabbitTemplate rabbitTemplate;

    public RealtimePublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publishEvent(String eventName, Map<String, Object> payload) {

        Map<String, Object> event = new LinkedHashMap<>();
        event.put("eventName", eventName);
        event.put("payload", payload);
        event.put("occurredAt", Instant.now().toString());

        rabbitTemplate.convertAndSend("ecommerce.events", "", event);
    }
}