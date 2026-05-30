package com.grocery.store.dto.response;

import com.grocery.store.entity.Product;

import java.math.BigDecimal;

public record ProductResponse(
        Long id,
        String name,
        String description,
        String imageUrl,
        BigDecimal price,
        Integer stockQuantity,
        Boolean active,
        Long categoryId,
        String categoryName
) {

    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getImageUrl(),
                product.getPrice(),
                product.getStockQuantity(),
                product.getActive(),
                product.getCategory().getId(),
                product.getCategory().getName()
        );
    }
}
