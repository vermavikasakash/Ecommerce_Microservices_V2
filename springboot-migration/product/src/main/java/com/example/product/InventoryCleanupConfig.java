
package com.example.product;

import com.example.product.service.InventoryService;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
public class InventoryCleanupConfig {

    private final InventoryService inventoryService;

    public InventoryCleanupConfig(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }
    // Schedule expired reservation cleanup i.e 1 minute
    @Scheduled(fixedDelay = 60000)
    public void releaseExpiredReservations() {
        inventoryService.releaseExpiredReservations();
    }
}
