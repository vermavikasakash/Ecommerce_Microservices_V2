package com.example.gateway.realtime;

import com.corundumstudio.socketio.Configuration;
import com.corundumstudio.socketio.SocketIOServer;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class RealtimeSocketServer {

    private final SocketIOServer server;

    public RealtimeSocketServer(@Value("${app.realtime.port:8086}") int port, @Value("${app.realtime.allowed-origin:http://localhost:3000}") String allowedOrigin) {

        Configuration config = new Configuration();
        config.setHostname("0.0.0.0");
        config.setPort(port);
        config.setOrigin(allowedOrigin);

        this.server = new SocketIOServer(config);

        server.addConnectListener(client -> {
            String customerId = client.getHandshakeData().getSingleUrlParam("customerId");

            if (customerId != null && !customerId.isBlank()) {
                client.joinRoom(customerId);

                client.sendEvent("gateway:connected", Map.of("message", "Connected to ecommerce realtime gateway", "customerId", customerId));

                System.out.println("Realtime client connected: " + customerId);
            }
        });
    }

    @PostConstruct
    public void start() {
        server.start();
        System.out.println("Socket.IO server started on port 8086");
    }

    @PreDestroy
    public void stop() {
        server.stop();
    }

    public void emitToCustomer(String customerId, String eventName, Object payload) {

        if (customerId == null || customerId.isBlank()) {
            System.out.println("Skipping realtime event: customerId is missing");
            return;
        }

        server.getRoomOperations(customerId).sendEvent(eventName, payload);
    }
}
