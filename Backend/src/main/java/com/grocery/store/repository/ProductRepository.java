package com.grocery.store.repository;

import com.grocery.store.entity.Product;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @EntityGraph(attributePaths = "category")
    List<Product> findByActiveTrue();

    @EntityGraph(attributePaths = "category")
    List<Product> findByCategoryIdAndActiveTrue(Long categoryId);

    @EntityGraph(attributePaths = "category")
    List<Product> findByNameContainingIgnoreCaseAndActiveTrue(String name);

    boolean existsByNameIgnoreCase(String name);

    Optional<Product> findFirstByNameIgnoreCase(String name);
}
