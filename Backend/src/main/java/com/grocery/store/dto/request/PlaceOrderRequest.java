package com.grocery.store.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PlaceOrderRequest(
        @NotNull(message = "User id is required")
        Long userId,

        @NotBlank(message = "Delivery address is required")
        String deliveryAddress,

        String deliverySlot,

        String paymentMethod,

        String razorpayOrderId,

        String razorpayPaymentId,

        String razorpaySignature
) {
}
