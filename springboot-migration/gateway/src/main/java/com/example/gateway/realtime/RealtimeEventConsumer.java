package com.example.gateway.realtime;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class RealtimeEventConsumer {

    private final RealtimeSocketServer socketServer;

    public RealtimeEventConsumer(RealtimeSocketServer socketServer) {
        this.socketServer = socketServer;
    }

    @RabbitListener(queues = "ecommerce-events-queue")
    public void consumeEvent(Map<String, Object> event) {

        String eventName = String.valueOf(event.get("eventName"));

        if (!(event.get("payload") instanceof Map<?, ?> payload)) {
            System.out.println("Invalid realtime payload: " + eventName);
            return;
        }

        Object customerIdValue = payload.get("customerId");
        String customerId = customerIdValue == null ? null : customerIdValue.toString();

        String socketEventName;

        switch (eventName) {
            case "cart.updated" -> socketEventName = "cart:updated";
            case "order.created" -> socketEventName = "order:created";
            case "payment.completed" -> socketEventName = "payment:completed";
            default -> {
                System.out.println("Ignoring unknown event: " + eventName);
                return;
            }
        }

        socketServer.emitToCustomer(customerId, socketEventName, payload);

        System.out.println("Forwarded " + eventName + " as " + socketEventName);
    }
}
