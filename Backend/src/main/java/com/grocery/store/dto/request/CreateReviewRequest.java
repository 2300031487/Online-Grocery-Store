package com.grocery.store.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateReviewRequest(
        @NotNull(message = "User ID is required")
        Long userId,

        @NotNull(message = "Product ID is required")
        Long productId,

        @NotNull(message = "Rating is required")
        @Min(value = 1, message = "Rating must be at least 1")
        @Max(value = 5, message = "Rating cannot be more than 5")
        Integer rating,

        @NotBlank(message = "Comment is required")
        @Size(max = 400, message = "Comment must be 400 characters or fewer")
        String comment
) {
}
