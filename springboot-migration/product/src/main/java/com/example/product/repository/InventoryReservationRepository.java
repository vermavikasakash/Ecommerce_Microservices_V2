
package com.example.product.repository;

import com.example.product.model.InventoryReservation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface InventoryReservationRepository
        extends MongoRepository<InventoryReservation, String> {

    @Query("{ 'id': ?0 }")
    Optional<InventoryReservation> findByReservationId(String reservationId);

    @Query("{ 'status': 'reserved', 'expiresAt': { '$lte': ?0 } }")
    List<InventoryReservation> findExpiredReservations(Instant now);
}
