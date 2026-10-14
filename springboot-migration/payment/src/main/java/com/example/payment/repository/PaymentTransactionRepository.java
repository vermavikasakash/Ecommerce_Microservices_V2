
package com.example.payment.repository;

import com.example.payment.model.PaymentTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface PaymentTransactionRepository
        extends MongoRepository<PaymentTransaction, String> {

    Optional<PaymentTransaction> findByTransactionId(String transactionId);

    Optional<PaymentTransaction> findByCustomerIdAndIdempotencyKey(
            String customerId, String idempotencyKey);
}
