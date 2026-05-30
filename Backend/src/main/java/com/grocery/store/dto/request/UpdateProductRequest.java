package com.grocery.store.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

public record UpdateProductRequest(
        String name,

        String description,

        String imageUrl,

        @DecimalMin(value = "0.01", message = "Price must be greater than zero")
        BigDecimal price,

        @Min(value = 0, message = "Stock quantity cannot be negative")
        Integer stockQuantity,

        Long categoryId
) {
}
