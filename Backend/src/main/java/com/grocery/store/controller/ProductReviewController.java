package com.grocery.store.controller;

import com.grocery.store.dto.request.CreateReviewRequest;
import com.grocery.store.dto.response.ProductReviewResponse;
import com.grocery.store.entity.ProductReview;
import com.grocery.store.service.ProductReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ProductReviewController {

    private final ProductReviewService productReviewService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductReviewResponse createReview(@Valid @RequestBody CreateReviewRequest request) {
        ProductReview review = productReviewService.createReview(
                request.userId(),
                request.productId(),
                request.rating(),
                request.comment()
        );
        return ProductReviewResponse.from(review);
    }

    @GetMapping("/product/{productId}")
    public List<ProductReviewResponse> getProductReviews(@PathVariable Long productId) {
        return productReviewService.getProductReviews(productId)
                .stream()
                .map(ProductReviewResponse::from)
                .toList();
    }
}
