package com.grocery.store.repository;

import com.grocery.store.entity.ProductReview;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {

    @EntityGraph(attributePaths = {"product", "user"})
    List<ProductReview> findByProductIdOrderByCreatedAtDesc(Long productId);
}
