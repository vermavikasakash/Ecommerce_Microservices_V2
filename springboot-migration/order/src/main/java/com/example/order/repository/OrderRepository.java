package com.example.order.repository;

import com.example.order.model.Order;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends MongoRepository<Order, String> {

    List<Order> findByCustomerId(String customerId);


    @Query("{ 'customerId': ?0, 'idempotencyKey': ?1 }")
    Optional<Order> findByCustomerIdAndIdempotencyKey(
            String customerId,
            String idempotencyKey
    );

    @Query("{ 'id': ?0, 'customerId': ?1 }")
    Optional<Order> findOrderByOrderIdAndCustomerId(
            String orderId,
            String customerId
    );

}