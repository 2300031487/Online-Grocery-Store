package com.grocery.store.dto.response;

import com.grocery.store.entity.ProductReview;

import java.time.LocalDateTime;

public record ProductReviewResponse(
        Long id,
        Long productId,
        Long userId,
        String customerName,
        Integer rating,
        String comment,
        LocalDateTime createdAt
) {

    public static ProductReviewResponse from(ProductReview review) {
        return new ProductReviewResponse(
                review.getId(),
                review.getProduct().getId(),
                review.getUser().getId(),
                review.getUser().getFullName(),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }
}
