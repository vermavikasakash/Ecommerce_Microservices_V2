package com.example.product.service;

import com.example.product.dto.ReservationRequest;
import com.example.product.model.InventoryReservation;
import com.example.product.model.InventoryReservation.ReservationItem;
import com.example.product.repository.InventoryReservationRepository;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class InventoryService {

    private final MongoTemplate mongoTemplate;
    private final InventoryReservationRepository reservationRepository;

    public InventoryService(MongoTemplate mongoTemplate, InventoryReservationRepository reservationRepository) {
        this.mongoTemplate = mongoTemplate;
        this.reservationRepository = reservationRepository;
    }

    public synchronized InventoryReservation reserve(ReservationRequest request, String customerId) {

        validate(request);

        var existing = reservationRepository.findByReservationId(request.reservationId());

        if (existing.isPresent()) {
            InventoryReservation reservation = existing.get();

            if (!reservation.getCustomerId().equals(customerId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Reservation belongs to another customer");
            }

            if ("reserved".equals(reservation.getStatus()) || "committed".equals(reservation.getStatus())) {
                return reservation;
            }

            throw new ResponseStatusException(HttpStatus.CONFLICT, "Reservation is no longer active");
        }

        List<ReservationItem> decremented = new ArrayList<>();

        try {
            for (ReservationItem item : request.items()) {
                Query query = Query.query(Criteria.where("id").is(item.getProductId()).and("stock").gte(item.getQuantity()));

                Update update = new Update().inc("stock", -item.getQuantity());

                var product = mongoTemplate.findAndModify(query, update, FindAndModifyOptions.options().returnNew(true), com.example.product.model.Product.class);

                if (product == null) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient stock for product " + item.getProductId());
                }

                decremented.add(item);
            }

            InventoryReservation reservation = new InventoryReservation();
            reservation.setReservationId(request.reservationId());
            reservation.setCustomerId(customerId);
            reservation.setItems(request.items());
            reservation.setStatus("reserved");
            reservation.setExpiresAt(request.expiresAt());
            reservation.setCreatedAt(Instant.now().toString());

            return reservationRepository.save(reservation);

        } catch (RuntimeException exception) {
            restoreItems(decremented);
            throw exception;
        }
    }

    public InventoryReservation get(String reservationId, String customerId) {
        InventoryReservation reservation = findReservation(reservationId);
        checkOwner(reservation, customerId);
        return reservation;
    }

    public synchronized InventoryReservation release(String reservationId, String customerId) {

        InventoryReservation reservation = findReservation(reservationId);
        checkOwner(reservation, customerId);

        if (!"reserved".equals(reservation.getStatus())) {
            return reservation;
        }

        reservation.setStatus("released");
        reservation.setReleasedAt(Instant.now().toString());
        reservationRepository.save(reservation);

        restoreItems(reservation.getItems());
        return reservation;
    }

    public synchronized InventoryReservation commit(String reservationId, String customerId) {

        InventoryReservation reservation = findReservation(reservationId);
        checkOwner(reservation, customerId);

        if ("committed".equals(reservation.getStatus())) {
            return reservation;
        }

        if (!"reserved".equals(reservation.getStatus()) || reservation.getExpiresAt() == null || !reservation.getExpiresAt().isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Inventory reservation is not active");
        }

        reservation.setStatus("committed");
        reservation.setCommittedAt(Instant.now().toString());
        return reservationRepository.save(reservation);
    }

    public void releaseExpiredReservations() {
        for (InventoryReservation reservation : reservationRepository.findExpiredReservations(Instant.now())) {
            try {
                release(reservation.getReservationId(), reservation.getCustomerId());
            } catch (RuntimeException exception) {
                System.err.println("Could not release expired reservation " + reservation.getReservationId() + ": " + exception.getMessage());
            }
        }
    }

    private InventoryReservation findReservation(String id) {
        return reservationRepository.findByReservationId(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory reservation not found"));
    }

    private void checkOwner(InventoryReservation reservation, String customerId) {
        if (!reservation.getCustomerId().equals(customerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Reservation belongs to another customer");
        }
    }

    private void restoreItems(List<ReservationItem> items) {
        for (ReservationItem item : items) {
            Query query = Query.query(Criteria.where("id").is(item.getProductId()));
            mongoTemplate.updateFirst(query, new Update().inc("stock", item.getQuantity()), com.example.product.model.Product.class);
        }
    }

    private void validate(ReservationRequest request) {
        if (request.reservationId() == null || request.reservationId().isBlank() || request.items() == null || request.items().isEmpty() || request.expiresAt() == null || !request.expiresAt().isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reservation id, items, and future expiry are required");
        }

        for (ReservationItem item : request.items()) {
            if (item.getProductId() == null || item.getQuantity() < 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reservation contains an invalid item");
            }
        }
    }
}
