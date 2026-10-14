
package com.example.product.repository;

import com.example.product.model.Product;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;

public interface ProductRepository
        extends MongoRepository<Product, String> {

    java.util.Optional<Product> findProductById(Integer id);

    @Query("{ 'id': ?0, 'stock': { '$gte': ?1 } }")
    @Update("{ '$inc': { 'stock': ?#{-#quantity} } }")
    long decrementStockIfAvailable(Integer id, int quantity);

    @Query("{ 'id': ?0 }")
    @Update("{ '$inc': { 'stock': ?1 } }")
    long incrementStock(Integer id, int quantity);
}
