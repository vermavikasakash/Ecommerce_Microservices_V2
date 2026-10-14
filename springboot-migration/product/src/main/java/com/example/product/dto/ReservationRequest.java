
package com.example.product.dto;

import com.example.product.model.InventoryReservation.ReservationItem;

import java.time.Instant;
import java.util.List;

public record ReservationRequest(
        String reservationId,
        List<ReservationItem> items,
        Instant expiresAt
) {}
