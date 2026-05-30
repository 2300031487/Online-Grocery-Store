package com.grocery.store.dto.request;

import jakarta.validation.constraints.NotNull;

public record CancelOrderRequest(
        @NotNull(message = "User id is required")
        Long userId
) {
}
