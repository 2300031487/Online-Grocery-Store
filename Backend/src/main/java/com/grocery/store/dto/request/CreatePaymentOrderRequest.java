package com.grocery.store.dto.request;

import jakarta.validation.constraints.NotNull;

public record CreatePaymentOrderRequest(
        @NotNull(message = "User ID is required")
        Long userId
) {
}
