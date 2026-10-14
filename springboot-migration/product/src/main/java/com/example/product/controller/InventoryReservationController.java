package com.example.product.controller;

import com.example.product.dto.ReservationRequest;
import com.example.product.model.InventoryReservation;
import com.example.product.service.InventoryService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/products/reservations")
public class InventoryReservationController {

    private final InventoryService inventoryService;

    public InventoryReservationController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> reserveInventory(@RequestBody ReservationRequest request, @RequestHeader("X-Customer-Id") String customerId) {

        InventoryReservation reservation = inventoryService.reserve(request, customerId);

        return Map.of("success", true, "reservation", reservation);
    }

    @GetMapping("/{reservationId}")
    public Map<String, Object> getReservation(@PathVariable String reservationId, @RequestHeader("X-Customer-Id") String customerId) {

        return Map.of("success", true, "reservation", inventoryService.get(reservationId, customerId));
    }

    @DeleteMapping("/{reservationId}")
    public Map<String, Object> releaseReservation(@PathVariable String reservationId, @RequestHeader("X-Customer-Id") String customerId) {

        return Map.of("success", true, "reservation", inventoryService.release(reservationId, customerId));
    }

    @PostMapping("/{reservationId}/commit")
    public Map<String, Object> commitReservation(@PathVariable String reservationId, @RequestHeader("X-Customer-Id") String customerId) {

        return Map.of("success", true, "reservation", inventoryService.commit(reservationId, customerId));
    }
}
