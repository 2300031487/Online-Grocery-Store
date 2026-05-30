package com.grocery.store.service;

import com.grocery.store.entity.OrderStatus;
import com.grocery.store.entity.Product;
import com.grocery.store.entity.ProductReview;
import com.grocery.store.entity.User;
import com.grocery.store.exception.BusinessRuleException;
import com.grocery.store.repository.OrderItemRepository;
import com.grocery.store.repository.ProductReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductReviewService {

    private final ProductReviewRepository productReviewRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductService productService;
    private final UserService userService;

    public ProductReview createReview(Long userId, Long productId, Integer rating, String comment) {
        User user = userService.getById(userId);
        Product product = productService.getActiveProductById(productId);

        if (user.getRole().name().equals("ADMIN")) {
            throw new BusinessRuleException("Only customers can review products");
        }
        boolean hasDeliveredOrder = orderItemRepository.existsByOrderUserIdAndProductIdAndOrderStatus(
                userId,
                productId,
                OrderStatus.DELIVERED
        );
        if (!hasDeliveredOrder) {
            throw new BusinessRuleException("You can review this product after it is delivered in your order history");
        }

        ProductReview review = ProductReview.builder()
                .user(user)
                .product(product)
                .rating(rating)
                .comment(comment)
                .createdAt(LocalDateTime.now())
                .build();

        return productReviewRepository.save(review);
    }

    public List<ProductReview> getProductReviews(Long productId) {
        return productReviewRepository.findByProductIdOrderByCreatedAtDesc(productId);
    }
}
